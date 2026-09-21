# Deploying Aegis

The existing GitHub repository is connected to the Vercel project yc-moss-aegis.
A push to main should trigger a production build. Verify the deployment status and
live health after every release; a successful Git push is not proof of deployment.

## Environment

Set these as server-side production variables in Vercel:

- MOSS_PROJECT_ID
- MOSS_PROJECT_KEY
- GROQ_API_KEY
- GROQ_MODEL (optional; default openai/gpt-oss-20b)
- MOSS_RETRIEVAL_MODE (optional; default local custom sessions; cloud is an alternate)

No personal customer dataset is needed. The bundled Northbridge policies are synthetic.

## Runtime

Use Node 22 or later and npm ci. next.config.ts externalizes native dependencies and
traces the MiniLM files plus the Linux ONNX runtime. Models are included in the repository,
so deployment has no model-download build step. No persistent filesystem is required.

Run npm run build, then npm start locally to test a production build.
For an authenticated manual deployment, run vercel --prod from this directory.
Do not create a second project; this directory is already linked.

## Verification

- GET /api/system/health should return moss=up and mode=moss-local.
- A daily Zelle limit question should release a source-cited answer.
- Prompt injection should stop before generation.
- Poisoned context should stop at source integrity.
- Invented policy should stop at output verification.
- The outage scenario should decline only its own request.
- The evaluation stream should end with a complete report.
- /evidence, /demo, the video, PDF, and diagram must be publicly accessible.

Cold starts include model/session construction; warmed measurements are not cold-start
measurements. Session trace memory is temporary and may differ across warm instances.
