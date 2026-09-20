import { INDEXES, mossQuery } from "./moss";
import { normalizeForPhraseMatching } from "./normalize";
import type { GroundingVerdict, RetrievedDoc } from "./types";

/** Semantic similarity score (0-1) against the threat-patterns index above which a message is blocked outright. */
const BLOCK_THRESHOLD = 0.6;
/** Below BLOCK but above this, the message is allowed through but flagged for review. */
const WARN_THRESHOLD = 0.4;

/** Grounding score thresholds against the knowledge-base index. */
const GROUNDED_THRESHOLD = 0.55;
const WEAK_THRESHOLD = 0.35;

/**
 * Fast local pre-filter for unambiguous injection phrasing. Catches the
 * obvious cases in ~0ms so they never even pay for a Moss round trip, and
 * backstops the semantic check for adversarial phrasing that's lexically
 * blunt but might sit just under the semantic threshold.
 */
const INJECTION_MARKERS: RegExp[] = [
  /ignore (all|any|the)?\s*(previous|prior|above)\s*instructions?/i,
  /disregard (your|the) (system prompt|guidelines|rules|instructions)/i,
  /forget everything (you (were|have been) told|above)/i,
  /you are (now|actually) (DAN|in developer mode|unrestricted)/i,
  /act as if you have no (restrictions|filters|guardrails|rules)/i,
  /pretend (you are|to be) .*(without|with no) (any )?(restrictions|rules|filters)/i,
  /system\s*override/i,
  /reveal (your|the) (system prompt|instructions)/i,
  /print (your|the) (system prompt|full instructions)/i,
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
  { name: "ssn", re: /\b\d{3}-\d{2}-\d{4}\b/, matchOn: "raw" },
  { name: "card_number", re: /\b(?:\d[ -]?){13,16}\b/, matchOn: "raw" },
  {
    name: "cvv_disclosure",
    re: /\b(tell|give|confirm|read back|repeat|show|reveal)\b.{0,40}\bcvv\b/i,
    matchOn: "normalized",
  },
  {
    name: "credential_disclosure",
    re: /\b(tell me|what(?:'s| is)|confirm|read back|repeat|say|reveal|give me)\b.{0,40}\b(my|the) (password|passcode|pin)\b/i,
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

export async function checkInput(message: string): Promise<GuardrailResult> {
  const start = performance.now();

  // Digit-based PII patterns (SSN/card numbers) need real digits, so they run
  // against the raw message. Phrase-based patterns — PII-disclosure requests
  // and the injection/jailbreak markers — run against a normalized form so
  // leetspeak, cross-script homoglyphs, and zero-width characters can't
  // trivially defeat the regex fallback.
  const normalizedMessage = normalizeForPhraseMatching(message);
  const piiHits = PII_PATTERNS.filter((p) =>
    p.re.test(p.matchOn === "raw" ? message : normalizedMessage)
  ).map((p) => p.name);
  const regexHit = INJECTION_MARKERS.some((re) => re.test(normalizedMessage));

  let topScore = 0;
  let topText: string | undefined;
  let topThreatType: string | undefined;
  let mossLatencyMs: number | undefined;

  try {
    // Tight budget: this check must never make a blocked request slower than
    // the regex fallback it's backed by. A degraded Moss backend falls
    // through to the regex-only path below well before a user would notice.
    // Queried with the ORIGINAL text, not the normalized one: Moss's
    // embedding model expects natural language, and character-level
    // leetspeak/homoglyph substitution on every message would risk
    // degrading genuine semantic matching more than it helps — obfuscation
    // resistance for the *semantic* layer is Moss's own problem to solve;
    // this normalization only targets the deterministic regex fallback.
    const result = await mossQuery(INDEXES.threats, message, { topK: 3, timeoutMs: 1200 });
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
  const blocked = regexHit || topScore >= BLOCK_THRESHOLD || piiHits.length > 0;

  if (blocked) {
    return {
      verdict: "block",
      reason: piiHits.length
        ? `Request asks the agent to expose or confirm sensitive data (${piiHits.join(", ")}).`
        : regexHit
          ? "Message matches a known prompt-injection / jailbreak phrasing pattern."
          : `Message is semantically similar (score ${topScore.toFixed(2)}) to a known attack: "${topText}"`,
      matchedPattern: topText,
      threatType: topThreatType ?? (piiHits.length ? "pii_exfiltration" : "prompt_injection"),
      score: topScore,
      latencyMs,
      mossLatencyMs,
      piiDetected: piiHits.length ? piiHits : undefined,
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

  if (!answer.trim()) {
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
      ? overlap.reduce((sum, d) => sum + d.score, 0) / overlap.length
      : 0
    : topScore;

  const verdict: GroundingVerdict =
    score >= GROUNDED_THRESHOLD ? "grounded" : score >= WEAK_THRESHOLD ? "weak" : "ungrounded";

  return { score, verdict, latencyMs, mossLatencyMs, supportingDocIds: overlap.map((d) => d.id) };
}

/** Scan agent OUTPUT for anything that looks like it leaked sensitive data, independent of the input check. */
export function scanOutputForPii(text: string): string[] {
  const hits: string[] = [];
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) hits.push("ssn");
  if (/\b(?:\d[ -]?){13,16}\b/.test(text)) hits.push("card_number");
  if (/\b\d{9,17}\b/.test(text.replace(/[^\d\s]/g, " ")) && /account|routing/i.test(text)) {
    hits.push("account_number");
  }
  return hits;
}
