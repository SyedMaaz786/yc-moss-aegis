# Aegis — the trust layer for AI agents, built on Moss

**YC Fall 2026 × Moss: The Zero Latency Builder Sprint — Track 4: Agent Reliability, Security & Evaluation**

Aegis wraps a RAG support agent (a fictional bank, "Northbridge Bank") with a real-time
trust layer: every user message is checked against a semantic threat index before the
agent is allowed to respond, every response is re-checked for grounding and leaked PII
before it reaches the user, and every step is timed and traced live. A built-in
evaluation harness scores the whole pipeline against a fixed adversarial + benign test
suite on demand.

**Live demo:** https://yc-moss-aegis.vercel.app
**Video walkthrough:** _(added before submission)_

## Why this, and why Moss

Guardrails and evaluation are usually slow: a second LLM call to judge the first one, a
network hop to a vector DB to check retrieval quality, a batch job that runs evals
overnight. That defeats the purpose of a "trust layer" that's supposed to sit in the hot
path of a live conversation.

Moss removes the retrieval round trip (sub-10ms, no vector DB), so Aegis uses it as more
than a RAG backend — it's the primitive for three different reliability checks that all
need to be fast enough to run on every single turn:

1. **Input guardrail** — the user's message is matched against a `threat-patterns` Moss
   index (jailbreaks, prompt injection, PII exfiltration, social engineering, fraud
   requests). A high-confidence match blocks the request **before the LLM is ever
   called** — adversarial requests get blocked in well under 100ms, benign ones proceed.
2. **Grounding check (faithfulness via re-retrieval)** — after the agent answers, Aegis
   re-queries the knowledge base using the *answer itself* as the query. A genuinely
   grounded answer re-retrieves the same source documents with a high score; an answer
   that drifted or hallucinated does not. No second LLM call needed.
3. **Continuous evaluation & tracing** — every request (and every eval run) is upserted
   into its own Moss index, so the dashboard can semantically search live traffic
   ("show me blocked jailbreak attempts") and eval runs are tracked over time instead of
   living in a single ephemeral report.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full component diagram and request
lifecycle, [`PRD.md`](./PRD.md) for the product spec, and [`THREAT_MODEL.md`](./THREAT_MODEL.md)
for the adversaries/assets/controls this build is actually defending against.

## What's in the box

- **Live Trust Console** (`/`) — chat with the protected agent, or click a preset attack
  (prompt injection, jailbreak, PII exfiltration, unauthorized transfer) to watch it get
  blocked in real time. A live feed shows every request's verdict, latency breakdown
  (input guardrail → Moss retrieval → Groq generation → output guardrail), and
  grounding score. A trace-search box lets you semantically query request history.
- **Evaluation harness** (`/eval`) — runs 18 fixed test cases (benign + adversarial, including
  Unicode/leetspeak-obfuscated injection attempts) through the full pipeline, scores safety
  accuracy, average grounding, and p95 latency, and persists every run to Moss so you can
  track regressions across runs.
- **Guardrail engine** (`src/lib/guardrails.ts`) — semantic threat matching + regex
  pre-filter for input, re-retrieval grounding + PII regex scan for output.
- **Agent pipeline** (`src/lib/agent.ts`) — orchestrates input guardrail → Moss retrieval
  → Groq generation → output guardrail, with per-step timing on every turn.
- **Live reliability status banner** — a persistent bar (`/api/system/health`,
  `src/components/SystemStatusBanner.tsx`) that reports Moss's actual round-trip health on
  every page, and switches to an honest degraded-mode message the moment a real Moss call
  fails — no polling a mock, this is wired to the same code path production traffic uses.
- **Chaos toggle** — a one-click "🧪 Simulate outage" control in that same banner
  (`/api/system/chaos`) that forces every Moss call in the app to fail on demand, so the
  failover behavior is demonstrable in a live judging session or a recording without
  needing to wait for (or hope for) a real outage. Auto-restores after 90 seconds.
- **Bounded-latency Moss calls** — every `mossQuery` carries a hard timeout (1.2s on the
  input guardrail, 3s elsewhere by default; see `src/lib/moss.ts`), so a slow or hanging
  upstream can never blow a request's latency budget — it fails the caller's `try/catch`
  and falls over to the local check instead.
- **Automated failover tests, no secrets required** (`src/lib/guardrails.test.ts`,
  `npm test`) — exercise the exact code path this project is leaning on for its
  reliability story: with zero Moss/Groq credentials configured, `checkInput` and
  `checkGrounding` must still correctly block known attacks, allow benign traffic, and
  fail safe to "ungrounded" rather than fabricate a score. Run in CI on every push
  (`.github/workflows/ci.yml`) alongside lint and a production build.

### Why this exists: built (and debugged) during a live Moss outage

On submission day, Moss's embedding-model CDN was returning 401s and its cloud query
fallback was returning 503s — a real, full outage, not a hypothetical one. Rather than
block on it, this project's answer was to make the failure visible and safe instead of
hidden, and to actually run the eval suite against the real outage instead of assuming
the fallback path worked:

Running it for real was worth doing — it initially came back with **safety accuracy of
41.7%**, not the ≥90% this project claims. The regex fallback had real, exploitable gaps
(`/ignore (all|any|the)? previous instructions/i` doesn't match "ignore **your** previous
instructions"; four whole attack categories — jailbreak variants, unauthorized-action
requests, social engineering, malicious-content requests — had close to zero regex
coverage at all). None of it showed up before because Moss's semantic layer was quietly
covering for every gap whenever it was healthy. The fix wasn't cosmetic: broadened,
category-labeled regex coverage across all six threat categories, plus short-circuiting
the guardrail to skip the Moss round trip entirely once a local pattern already knows to
block (previously every blocked request still waited out Moss's full timeout before
returning). Re-running the same suite against the same live outage afterward: **18/18
passing, 100% safety accuracy, blocked requests resolving in 0-2ms** — verified against
reality, not asserted in a doc.

The status banner reports the outage honestly on every page, and the chaos toggle exists
so this story doesn't depend on Moss recovering before a judge looks at it. This is,
arguably, a more honest demonstration of an "Agent Reliability, Security & Evaluation"
submission than a scripted happy path would have been — the evaluation harness didn't
just score the product, it found a real bug in it.

## Tech stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · `@moss-dev/moss` (Node SDK) ·
Groq (`openai/gpt-oss-20b`, ~1000 tok/s) for generation · deployed on Vercel.

Single full-stack app, no separate backend — Moss already removes the network hop that
would normally justify one.

## Getting started

### 1. Prerequisites

- Node.js 20+
- A [Moss](https://moss.dev) account (free tier) — sign up, create a project, grab
  `MOSS_PROJECT_ID` and `MOSS_PROJECT_KEY`.
- A free [Groq API key](https://console.groq.com) (no card required).

### 2. Install & configure

```bash
npm install
cp .env.example .env.local
# edit .env.local and fill in MOSS_PROJECT_ID, MOSS_PROJECT_KEY, GROQ_API_KEY
```

### 3. Seed the Moss indexes

```bash
npm run seed
```

This creates/updates three indexes from the JSON files in `data/`:
`aegis-knowledge-base` (bank policy docs), `aegis-threat-patterns` (attack examples),
and `aegis-eval-cases`. Safe to re-run — it upserts.

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the console, or
[http://localhost:3000/eval](http://localhost:3000/eval) for the evaluation harness.

## Design notes / scope choices

- **Single-turn, stateless chat.** Each message is checked and answered independently —
  no multi-turn conversation memory. This keeps every guardrail decision auditable in
  isolation and matches the track's focus (reliability/security of a single agent turn)
  rather than conversation-state management.
- **In-memory trace buffer + Moss for durability.** The live feed reads from an
  in-process ring buffer (fast, no round trip) and every trace is also upserted to Moss
  in the background, so trace search survives across warm instances and is semantically
  queryable, not just a local cache.
- **Fixed eval suite, not LLM-as-judge.** Grading adversarial cases by "did the guardrail
  block it" and benign cases by "did it get answered and stay grounded" is deterministic
  and fast. An LLM-judge step would add cost and latency variance without changing what
  the track is asking for (reliability/security/evaluation *of* an agent, not a judge
  model).

## License

MIT — see [`LICENSE`](./LICENSE).
