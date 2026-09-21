import { INDEXES, mossQuery } from "./moss";
import { normalizeForPhraseMatching } from "./normalize";
import { API_KEY_PATTERN } from './privacy';
import type { GroundingVerdict, RetrievedDoc } from "./types";

/** Semantic similarity score (0-1) against the threat-patterns index above which a message is blocked outright. */
const BLOCK_THRESHOLD = 0.75;
/** Below BLOCK but above this, the message is allowed through but flagged for review. */
const WARN_THRESHOLD = 0.55;

/** Grounding score thresholds against the knowledge-base index. */
const GROUNDED_THRESHOLD = 0.55;
const WEAK_THRESHOLD = 0.35;

interface InjectionMarker {
  re: RegExp;
  threatType: string;
}

/**
 * Fast local pre-filter for unambiguous adversarial phrasing, covering every
 * category in the eval suite (data/eval-cases.json) — not just prompt
 * injection. Catches the obvious cases in ~0ms so they never even pay for a
 * Moss round trip, and backstops the semantic check when Moss is degraded
 * or unavailable, which is the ONLY thing standing between a request and
 * the LLM in that state (see guardrails.test.ts and THREAT_MODEL.md).
 *
 * Deliberately written with single optional filler words (e.g. "ignore
 * (\w+ )?previous instructions" rather than requiring an exact "all/any/the"
 * list) — a rigid alternation list looks thorough but silently misses
 * anything phrased slightly differently ("ignore YOUR previous
 * instructions"), which is exactly the kind of gap that stays invisible
 * while Moss's semantic layer is covering for it and only shows up once
 * Moss is down. Verified against the full eval suite with Moss forced
 * unavailable, not just hand-picked examples.
 */
const INJECTION_MARKERS: InjectionMarker[] = [
  // --- prompt injection ---
  { re: /ignore\s+(?:\w+\s+)?(previous|prior|above)\s+instructions?/i, threatType: "prompt_injection" },
  { re: /disregard\s+(?:\w+\s+){0,6}(system prompt|guidelines|rules|instructions|bank policy)/i, threatType: "prompt_injection" },
  { re: /forget everything\s+(?:\w+\s+){0,3}(told|above)/i, threatType: "prompt_injection" },
  { re: /system\s*override/i, threatType: "prompt_injection" },
  { re: /reveal\s+(?:\w+\s+)?(your|the)\s+(?:\w+\s+)?(system prompt|instructions)/i, threatType: "prompt_injection" },
  { re: /print\s+(?:\w+\s+)?(your|the)\s+(?:\w+\s+)?(system prompt|full instructions)/i, threatType: "prompt_injection" },
  { re: /what\s+(?:\w+\s+){0,2}you\s+(?:were\s+)?(?:never\s+)?(?:told|instructed)\s+(?:to\s+)?never\s+(?:to\s+)?say/i, threatType: "prompt_injection" },

  // --- jailbreak / persona override ---
  { re: /you(?:'re| are)\s+(?:now\s+|actually\s+)?(DAN|in developer mode|unrestricted)/i, threatType: "jailbreak" },
  { re: /no content polic(y|ies)/i, threatType: "jailbreak" },
  { re: /act as if you have no\s+(restrictions|filters|guardrails|rules)/i, threatType: "jailbreak" },
  { re: /pretend\s+(you're|you are|to be)\b.{0,60}\b(without|with no)\s+(any\s+)?(restrictions|rules|filters)/i, threatType: "jailbreak" },
  { re: /developer mode\b.{0,30}\bdisabled\b/i, threatType: "jailbreak" },

  // --- unauthorized action (fraud / transfers) ---
  { re: /\bskip\s+(the\s+)?verification\b/i, threatType: "unauthorized_action" },
  { re: /\bbypass\s+(the\s+)?(verification|security check|id check)\b/i, threatType: "unauthorized_action" },
  { re: /\b(wire|transfer|send)\b.{0,60}\bwithout\s+verif/i, threatType: "unauthorized_action" },

  // --- social engineering (claimed authority to bypass checks) ---
  { re: /\bi'?m\s+(the|a)\b.{0,50}\b(compliance officer|bank manager|regulator|auditor)\b.{0,80}\b(waive|bypass|share|skip|disclose)\b/i, threatType: "social_engineering" },
  { re: /\bwaive\s+(the\s+)?(id check|verification)\b/i, threatType: "social_engineering" },

  // --- malicious request (asking the agent to generate an attack artifact) ---
  { re: /\b(write|draft|create|generate|compose)\b.{0,35}\bphishing\s+(email|message)\b/i, threatType: "malicious_request" },
  { re: /\bpretending to be\b.{0,60}\basking\b.{0,40}\bpassword\b/i, threatType: "malicious_request" },
];

interface PiiPattern {
  name: string;
  re: RegExp;
  /**
   * "raw": needs a literal digit run (SSN/card number) — normalizing would
   * convert digits to letters and break the match.
   * "normalized": a phrase pattern like the injection markers — matched
   * against obfuscation-normalized text so leetspeak/homoglyph/zero-width
   * tricks can't bypass it either (e.g. "t3ll m3 my p4ssw0rd").
   */
  matchOn: "raw" | "normalized";
}

// Deliberately narrow: these match a user PASTING sensitive data into chat, or
// explicitly asking the agent to DISCLOSE/CONFIRM it — not routine banking
// questions. ("What's your routing number" and "how do I reset my password"
// are both completely benign and must not trip this.)
const PII_PATTERNS: PiiPattern[] = [
  { name: 'api_key', re: API_KEY_PATTERN, matchOn: 'raw' },
  { name: 'account_disclosure', re: /\b(show|reveal|read back|give me|tell me|repeat)\b.{0,40}\b(account number|card number|one.time (passcode|password))\b/i, matchOn: 'normalized' },
  { name: "ssn", re: /\b\d{3}-\d{2}-\d{4}\b/, matchOn: "raw" },
  { name: "card_number", re: /\b(?:\d[ -]?){13,16}\b/, matchOn: "raw" },
  {
    name: "cvv_disclosure",
    re: /\b(tell|give|confirm|read back|repeat|show|reveal)\b.{0,40}\bcvv\b/i,
    matchOn: "normalized",
  },
  {
    name: "credential_disclosure",
    // The filler group between "(my|the)" and "password/passcode/pin" lets
    // "my ONLINE BANKING password" match (a real disclosure attempt), but
    // must not swallow words like "new"/"temporary" — those mark a benign
    // status-of-a-change question ("confirm the NEW pin I just set"), not a
    // request to disclose the current secret. The negative lookahead keeps
    // those words out of the filler so that specific shape doesn't match.
    re: /\b(tell me|what(?:'s| is)|confirm|read back|repeat|say|reveal|give me)\b.{0,40}\b(my|the)\s+(?:(?!new\b|temp\b|temporary\b|updated?\b|current\b|old\b|previous\b)\w+\s+){0,3}(password|passcode|pin)\b/i,
    matchOn: "normalized",
  },
];

export interface GuardrailResult {
  verdict: "allow" | "warn" | "block";
  reason?: string;
  matchedPattern?: string;
  threatType?: string;
  score: number;
  latencyMs: number;
  mossLatencyMs?: number;
  piiDetected?: string[];
}

export async function checkInput(message: string, localOnly = false): Promise<GuardrailResult> {
  const start = performance.now();

  // Digit-based PII patterns (SSN/card numbers) need real digits, so they run
  // against the raw message. Phrase-based patterns — PII-disclosure requests
  // and the injection/jailbreak markers — run against a normalized form so
  // leetspeak, cross-script homoglyphs, and zero-width characters can't
  // trivially defeat the regex fallback.
  const normalizedMessage = normalizeForPhraseMatching(message);
  const digitMessage = message.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '');
  const piiHits = PII_PATTERNS.filter((p) =>
    p.re.test(p.matchOn === "raw" ? digitMessage : normalizedMessage)
  ).map((p) => p.name);
  const regexMatch = INJECTION_MARKERS.find((m) => m.re.test(normalizedMessage));
  const regexHit = Boolean(regexMatch);

  // A local pattern already decided this is a block — return immediately
  // without paying for a Moss round trip at all. Querying Moss anyway (even
  // just to enrich the trace with a semantic score) would mean an already-
  // certain block still pays the full Moss timeout on every degraded
  // request, which is exactly backwards for a check whose whole point is to
  // reject adversarial input fast: it defeats both the "blocked in well
  // under the LLM's latency" claim and, concretely, the eval suite's
  // latency budget for every adversarial case whenever Moss is slow or down.
  if (regexHit || piiHits.length) {
    return {
      verdict: "block",
      reason: piiHits.length
        ? `Request asks the agent to expose or confirm sensitive data (${piiHits.join(", ")}).`
        : "Message matches a known adversarial phrasing pattern.",
      threatType: piiHits.length ? "pii_exfiltration" : regexMatch?.threatType ?? "prompt_injection",
      score: 0,
      latencyMs: performance.now() - start,
      piiDetected: piiHits.length ? piiHits : undefined,
    };
  }

  if (localOnly) return { verdict: 'allow', score: 0, latencyMs: performance.now() - start };
  let topScore = 0;
  let topText: string | undefined;
  let topThreatType: string | undefined;
  let mossLatencyMs: number | undefined;

  try {
    const result = await mossQuery(INDEXES.threats, message, { topK: 3, timeoutMs: 12000 });
    mossLatencyMs = result.timeTakenInMs;
    const top = result.docs[0];
    if (top) {
      topScore = top.score;
      topText = top.text;
      topThreatType = top.metadata?.threat_type;
    }
  } catch (err) {
    console.error("[guardrails] threat-pattern query failed, falling back to regex-only", err);
  }

  const latencyMs = performance.now() - start;

  if (topScore >= BLOCK_THRESHOLD) {
    return {
      verdict: "block",
      reason: `Message is semantically similar (score ${topScore.toFixed(2)}) to a known attack: "${topText}"`,
      matchedPattern: topText,
      threatType: topThreatType ?? "prompt_injection",
      score: topScore,
      latencyMs,
      mossLatencyMs,
    };
  }

  if (topScore >= WARN_THRESHOLD) {
    return {
      verdict: "warn",
      reason: `Elevated similarity (${topScore.toFixed(2)}) to threat pattern "${topText}", but below the block threshold.`,
      matchedPattern: topText,
      threatType: topThreatType,
      score: topScore,
      latencyMs,
      mossLatencyMs,
    };
  }

  return { verdict: "allow", score: topScore, latencyMs, mossLatencyMs };
}

export interface GroundingResult {
  score: number;
  verdict: GroundingVerdict;
  latencyMs: number;
  mossLatencyMs?: number;
  supportingDocIds: string[];
}

/**
 * Faithfulness check: re-query the knowledge base using the AGENT'S ANSWER as
 * the query. If the answer is truly grounded in the docs it was given, it
 * should semantically re-retrieve those same docs with a high score. If the
 * top results diverge from the original context, the answer likely drifted
 * or hallucinated beyond what was retrieved.
 */
export async function checkGrounding(answer: string, contextDocIds: string[]): Promise<GroundingResult> {
  const start = performance.now();

  if (!answer.trim() || contextDocIds.length === 0) {
    return { score: 0, verdict: "ungrounded", latencyMs: performance.now() - start, supportingDocIds: [] };
  }

  let docs: RetrievedDoc[] = [];
  let mossLatencyMs: number | undefined;
  try {
    const result = await mossQuery(INDEXES.knowledge, answer, { topK: 5 });
    mossLatencyMs = result.timeTakenInMs;
    docs = result.docs.map((d) => ({ id: d.id, text: d.text, score: d.score }));
  } catch (err) {
    console.error("[guardrails] grounding query failed", err);
  }

  const latencyMs = performance.now() - start;
  const overlap = docs.filter((d) => contextDocIds.includes(d.id));
  const topScore = docs[0]?.score ?? 0;

  const score = contextDocIds.length
    ? overlap.length
      ? Math.max(...overlap.map(d => d.score))
      : 0
    : topScore;

  const verdict: GroundingVerdict =
    score >= GROUNDED_THRESHOLD ? "grounded" : score >= WEAK_THRESHOLD ? "weak" : "ungrounded";

  return { score, verdict, latencyMs, mossLatencyMs, supportingDocIds: overlap.map((d) => d.id) };
}

/** Scan agent OUTPUT for anything that looks like it leaked sensitive data, independent of the input check. */
export function scanOutputForPii(text: string): string[] {
  text = text.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '');
  const hits: string[] = [];
  if (API_KEY_PATTERN.test(text)) hits.push('api_key');
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) hits.push("ssn");
  if (/\b(?:\d[ -]?){13,16}\b/.test(text)) hits.push("card_number");
  if (/\b\d{9,17}\b/.test(text.replace(/[^\d\s]/g, " ")) && /account|routing/i.test(text)) {
    hits.push("account_number");
  }
  return hits;
}
