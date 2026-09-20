# Submission form — copy/paste answers

Reference only (not part of the app). Fill in the bracketed values once the
live demo is deployed, then delete or keep this file — it's just scratch for
filling out the HiDevs/Devpost form.

## Project / Agent Name
Aegis

## GitHub Repository
https://github.com/SyedMaaz786/yc-moss-aegis

## Live Demo URL
https://yc-moss-aegis.vercel.app

## Video Demo URL (optional but strongly recommended)
[record a 2-min screen capture: open the live console, click through the 4
attack presets to show them getting blocked instantly, ask 1-2 benign
questions to show grounded answers + latency breakdown, run the eval suite
on /eval to show the scorecard, then use the trace-search box]

## Problem statement / theme
Agent Reliability, Security and Evaluation

## About your project
Aegis is a real-time trust layer for AI agents. It wraps a RAG bank-support
assistant with guardrails that block prompt injection, jailbreaks, and PII
exfiltration attempts before the LLM is ever called, a grounding check that
verifies every answer is actually backed by retrieved policy content (not
hallucinated), and full per-step latency tracing on every request. An
evaluation harness runs 18 benign + adversarial test cases on demand and
scores safety accuracy, grounding, and latency budgets, persisting every run
so regressions are visible over time.

It also does something most hackathon submissions don't get to demonstrate
honestly: it proves its own reliability claim under a real failure, and it
found and fixed a real bug in the process. Moss's model CDN and cloud query
API were both genuinely down for part of the build window — the live status
banner reported that honestly instead of hiding it, and a one-click chaos
toggle can reproduce the same outage on demand so a judge can verify the
failover themselves. Running the eval suite against that real outage
initially returned 41.7% safety accuracy, not the ≥90% this project claims —
the regex fallback (the only thing standing between a request and the LLM
while Moss is down) had real, exploitable phrasing gaps across most attack
categories, invisible until Moss's semantic layer stopped covering for them.
The fix — broadened, category-labeled regex coverage plus skipping the Moss
round trip entirely once a local pattern already knows to block — brought it
to 18/18 passing, 100% safety accuracy, blocked requests resolving in 0-2ms.
17 automated tests (`npm test`, zero credentials required, run in CI on
every push) pin that behavior down as a regression test now, not a one-time
fix.

## How did you use Moss in your retrieval layer?
Moss is used for three different jobs, not just RAG retrieval:
1. Input guardrail: the user's message is semantically matched (sub-10ms)
   against a `threat-patterns` Moss index of jailbreak/injection/PII-exfil
   examples. A high-confidence match blocks the request before it ever
   reaches the LLM.
2. Grounding check via re-retrieval: after the agent answers, Aegis re-queries
   the knowledge-base Moss index using the answer itself as the query. A
   faithful answer re-retrieves its own source docs with a high score; a
   hallucinated one doesn't — this reuses Moss's retrieval speed as an
   evaluation primitive instead of a second slow LLM-judge call.
3. Durable, searchable observability: every request and every eval run is
   upserted into its own Moss index (`aegis-traces`, `aegis-eval-runs`), so
   the dashboard can semantically search live traffic ("show me blocked
   jailbreak attempts") and track eval scores run-over-run.

Because Moss's retrieval is fast enough to run on every turn (not just at
index time), all three checks run inline in the request path instead of as a
slow, separate offline process. And because Moss is now load-bearing for
security decisions rather than just answer quality, every call to it is
timeout-bounded and has a tested local fallback — see "Why this exists: built
during a live Moss outage" in the README.

## Impact
Guardrails and evals are usually the first thing cut from an AI agent's
architecture because they add latency and complexity. Aegis demonstrates that
with fast enough retrieval, they don't have to be a tradeoff: blocked
adversarial requests resolve in 0-2ms, verified against the live suite (faster
than most agents' retrieval step alone), and every response ships with a live
grounding score instead of a "trust me." The pattern — semantic guardrails +
re-retrieval grounding + durable trace search, all backed by one fast
retrieval primitive — generalizes directly to any RAG agent handling
sensitive actions (banking, healthcare, support), not just this demo. And the
process that got it there — build, evaluate against real conditions (not a
happy path), find the actual gap, fix it, re-verify — is itself the argument
for why "evaluation" belongs in the same sentence as "reliability" and
"security": a system nobody stress-tested is a system nobody has actually
verified.
