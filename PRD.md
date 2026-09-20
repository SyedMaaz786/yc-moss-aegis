# PRD — Aegis: a real-time trust layer for AI agents

**Track:** YC Fall 2026 × Moss Zero Latency Builder Sprint — Agent Reliability, Security & Evaluation
**Status:** Built for the sprint's submission window (Sept 6–20, 2026)

## 1. Problem

Teams shipping AI agents (support bots, copilots, voice agents) need three things before
they'll trust an agent in front of real users:

1. **Guardrails** that stop prompt injection, jailbreaks, and PII exfiltration attempts
   *before* the agent acts on them.
2. **Evidence that responses are grounded** in real source material, not hallucinated.
3. **Visibility into latency and failure modes** in production, not just at test time.

Most implementations bolt these on as slow, separate systems: a second LLM call to
judge the first one, an offline eval notebook that runs once a week, a vector-DB lookup
that adds 200-500ms to every turn just to sanity-check retrieval. That's expensive and
too slow to run on every request, so teams end up skipping it in the hot path.

## 2. Solution

Aegis is a reference implementation of a **reliability layer that runs on every single
turn**, made viable by Moss's sub-10ms local-first retrieval:

- Input guardrail: semantic match against a threat-pattern index, blocks before the LLM
  call.
- Output guardrail: grounding check via re-retrieval (the answer, used as a query, must
  re-find its own source docs) plus a PII regex scan.
- Every request and every eval run is persisted as a Moss index, so both are
  semantically searchable/trackable, not just logged.

It's demonstrated on a concrete agent (a bank support assistant) so the guardrails have
real stakes: don't leak account numbers, don't approve transfers, don't get socially
engineered into bypassing verification.

## 3. Target users

- Teams building customer-facing AI agents (support, voice, copilots) who need a
  guardrail + eval pattern they can adapt, not just a library to bolt on.
- Judges/evaluators of this hackathon track, who need to see the three bullet points in
  the track description (guardrails, evaluation, latency tracing) working live, not just
  described in a slide.

## 4. Scope (what's built)

| Area | Included |
|---|---|
| Input guardrails | Semantic threat matching (Moss) + regex pre-filter; blocks prompt injection, jailbreaks, PII-exfiltration requests, unauthorized-action requests, social engineering |
| Output guardrails | Grounding/faithfulness check via re-retrieval; PII regex scan on generated output; safe fallback response on block |
| Latency tracing | Per-step timing (input guardrail, retrieval, LLM generation, output guardrail) on every request, visualized as a live breakdown |
| Evaluation harness | 16 fixed test cases (6 benign, 10 adversarial across 5 threat categories), scored on verdict correctness, grounding, and latency budget; results persisted to Moss for run-over-run tracking |
| Live console | Chat UI with one-click attack presets, live guardrail feed, session stats, semantic trace search |
| Reliability & observability | Live Moss health banner on every page; a chaos toggle that forces a simulated outage on demand for demoing failover; hard timeouts on every Moss call so a slow upstream can't blow the latency budget; automated tests proving the failover path works with zero credentials configured, run in CI on every push |
| Deployment | Single Next.js app, deployable to Vercel |

## 5. Explicitly out of scope

- Multi-turn conversation memory (each turn is independent — see README "Design notes").
- Voice/telephony integration (LiveKit etc.) — the track doesn't require it, and adding
  it would dilute focus from the reliability/security/evaluation mechanics themselves.
- Auth/multi-tenant accounts — this is a single-demo-agent reference implementation, not
  a multi-customer SaaS product (though the guardrail/eval/tracing pattern generalizes
  directly to one).
- LLM-as-judge scoring — deliberately avoided in favor of deterministic, fast checks
  (see README design notes) to keep the eval loop itself fast and reproducible.

## 6. Success metrics (for this build)

- **Safety accuracy ≥ 90%** on the adversarial eval cases (blocked when it should be).
- **Blocked requests resolve in < 200ms** (never reach the LLM) — demonstrates the
  latency payoff of checking *before* generation.
- **Grounded responses score ≥ 55%** on the re-retrieval grounding check for benign
  cases.
- Live demo runs end-to-end on a public URL with no local setup required for judges.

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Semantic threat match misses novel phrasing | Regex pre-filter catches lexically obvious cases independent of the semantic score; eval suite tracks safety accuracy over time as the threat index grows |
| Grounding check false-positives on legitimately paraphrased answers | Threshold tuned to "weak" (warn) vs "ungrounded" (block-equivalent) rather than a single binary cutoff |
| Native Moss SDK (N-API) compatibility on Vercel's serverless runtime | `serverExternalPackages` configured in `next.config.ts`; verified with a preview deployment before final submission |
| Public demo cost/abuse | Per-IP rate limiting on `/api/chat` (20 req/min) and `/api/system/chaos` |
| Moss backend itself unavailable (observed live on submission day — model CDN 401s, cloud query 503s) | Every Moss call is timeout-bounded and wrapped in try/catch with a tested local fallback (regex guardrails, fail-safe "ungrounded" grounding); the live status banner reports this honestly instead of masking it; a chaos toggle reproduces the exact failure on demand so the behavior doesn't depend on Moss's uptime at demo time |

## 8. Open questions for future iterations

- Should the threat-pattern index support tenant-specific customization (per-deployment
  threat libraries)?
- Would a lightweight LLM-judge pass as a *secondary* signal (not blocking) improve
  grounding precision without hurting latency?
