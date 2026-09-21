# Aegis — evidence before trust

**A runtime trust layer for AI agents, built with Moss.**

YC Fall 2026 × Moss Builder Sprint · Track 4: Agent Reliability, Security & Evaluation

Built by **[SyedMaaz786](https://github.com/SyedMaaz786)**.

[Live console](https://yc-moss-aegis.vercel.app) · [Evaluation lab](https://yc-moss-aegis.vercel.app/eval) · [Evidence](https://yc-moss-aegis.vercel.app/evidence) · [Two-minute demo](https://yc-moss-aegis.vercel.app/demo)

![Aegis console](public/submission/console.png)

An agent that refuses every request is safe but useless. An agent that confidently
answers everything is useful until it is wrong. Aegis makes both sides visible:
**what was prevented, what was answered, and what evidence justified release.**

Try a fictional bank policy question, inject an instruction, tamper with retrieved
context, fabricate a policy amount, or simulate an outage. Every turn produces an
inspectable decision with sources, stage timings, and a downloadable JSON receipt.

## What makes this different

- **Five release gates:** input screening → Moss retrieval → source integrity →
  candidate generation → output verification. Rejected output never reaches the user
  or the trace store.
- **Context is checked before the model sees it.** Retrieved text must match a
  versioned SHA-256 policy manifest. A forged document with a legitimate ID is quarantined.
- **Semantic similarity is not treated as factual proof.** A numerical-claim check
  catches invented policy amounts even when the answer is topically similar.
- **The model CDN is not a runtime dependency.** A bundled quantized MiniLM encoder
  supplies vectors to Moss's native custom sessions. Moss performs the searches;
  document and query embeddings use the same model bytes.
- **Honest evaluation:** benign cases require useful, released, grounded answers.
  Expected policy facts must appear in each benign answer. Missing evidence and provider errors fail the case. Attack blocking, benign success,
  false positives, and latency are reported separately.
- **Private, inspectable evidence:** sensitive identifiers are redacted; temporary
  traces are isolated by browser session; users can export receipts. Chaos is
  request-scoped and cannot disable someone else's session.

## Moss's role

Moss performs semantic candidate retrieval for threat matching, banking policy context,
answer-to-source re-retrieval, and session trace search. The default path uses
`client.session(name, "custom")`, `session.addDocs`, and `session.query` with
384-dimensional caller-supplied embeddings.

The bundled encoder is **Xenova/all-MiniLM-L6-v2**, quantized to q8. The model revision
is recorded in [provenance.json](models/all-MiniLM-L6-v2/provenance.json). Query and
document vectors are normalized identically. Warm searches run locally, without a
vector database or model CDN request. The UI reports **embedding time and Moss search
time separately**; cold-start/index construction time remains in total latency.

Moss's hybrid result scores are rank-fusion scores, not calibrated confidence.
Aegis calculates cosine similarity **only for candidates returned by Moss** before
applying safety thresholds. See [moss.ts](src/lib/moss.ts).

The optional `MOSS_RETRIEVAL_MODE=cloud` uses the pre-existing cloud-loaded indexes.
The default local-session path was implemented after the foundation-model CDN returned
HTTP 401 during development. The working path uses the supported custom-embedding API,
not a fake search fallback.

## Measured evidence

[The recorded 32-case run](artifacts/evaluation.json) used real Moss retrieval and
Groq generation on the development machine on September 21, 2026:

| Measurement | Result |
|---|---:|
| All checks, including latency | 32 / 32 |
| Adversarial inputs blocked | 20 / 20 |
| Benign answers successfully released | 12 / 12 |
| Benign input false positives | 0 / 12 |
| Total-turn p95 | 545 ms |

This is a small **public regression suite used during development**, not an independent
security benchmark. Results can change with cold starts, hardware, and provider state.
Run the live evaluation to obtain a fresh measurement. No sub-10ms total-response claim
is made; generation is a separate network call.

The previous evaluation incorrectly accepted infrastructure refusals as benign passes.
That scoring bug has been removed and regression-tested.

## Run locally

Node.js 22+ recommended (CI uses Node 22).

```sh
npm ci
cp .env.example .env.local
# Set MOSS_PROJECT_ID, MOSS_PROJECT_KEY, GROQ_API_KEY
npm run dev
```

The model is included in the repository. No model download or cloud index seeding is
needed for the default local-session mode. Moss credentials and a Groq key are still
required. Keep them in `.env.local`; never commit them.

```sh
npm test                 # deterministic security/failure-path tests, no credentials
npm run lint
npm run build
npm start
npm run test:e2e         # requires running app + configured providers
npm run evaluate        # real 32-case evaluation; writes artifacts/evaluation.json
```

Moss indexing is optional: `npm run seed` provisions cloud indexes for the alternate
cloud path. It is not required to demonstrate the local native retrieval path.

## Submission materials

- [PRD](PRD.md) · [PDF](public/submission/PRD.pdf)
- [Architecture](ARCHITECTURE.md) · [SVG diagram](public/submission/architecture.svg)
- [Threat model and limitations](THREAT_MODEL.md)
- [Submission copy and checklist](SUBMISSION.md)
- [Deployment notes](DEPLOY.md)
- [Video](public/submission/aegis-demo.mp4) · [Captions](public/submission/demo.vtt)

The two-minute demo captures the working application with an offline synthetic voice
and captions. Its reproducible recording scripts are in [recordings](recordings).

Validation: 42 unit tests and three browser tests cover live gates, evaluation,
accessibility, exports, trace search, request validation, redaction, and session isolation.

## Scope and limitations

Northbridge Bank and its policies are synthetic. The app has **no banking tools** and
cannot move money or modify accounts. Each request is a single independent turn.

Similarity and numeric membership checks are heuristics, not logical entailment or a
guarantee against prompt injection. A correct-looking number can still be attached to
the wrong claim. The policy manifest assumes the application repository is trusted.

Trace memory is per-process, session-scoped, bounded, and expires after one hour.
Serverless restarts or instance routing can clear it. JSON exports preserve evidence;
this build does not claim durable cloud trace storage. Evaluation history is saved in
the visitor's browser. Rate limits are per instance.

App code: [MIT](LICENSE). Bundled model: Apache-2.0; see
[third-party notices](THIRD_PARTY_NOTICES.md). Moss SDK has its own license.
