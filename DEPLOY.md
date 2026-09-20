# Deploying Aegis to Vercel

## Option A — you drive it (2 commands, no token needed)

```bash
npm install -g vercel
vercel login          # opens a browser / emails a verification link
vercel --prod         # from the project root; follow the prompts
```

When prompted, link to a new project. After the first deploy, set the three
environment variables (Project Settings → Environment Variables in the Vercel
dashboard, or via CLI):

```bash
vercel env add MOSS_PROJECT_ID production
vercel env add MOSS_PROJECT_KEY production
vercel env add GROQ_API_KEY production
vercel env add GROQ_MODEL production   # optional, defaults to llama-3.3-70b-versatile
```

Then redeploy so the new env vars take effect:

```bash
vercel --prod
```

## Option B — give Claude a token and it drives the CLI end-to-end

1. Go to https://vercel.com/account/tokens, create a token.
2. Share `VERCEL_TOKEN=...` — every `vercel` command can then run non-interactively
   with `--token $VERCEL_TOKEN --yes`, including setting env vars and deploying,
   with no browser step required.

## Notes / gotchas

- **Runtime:** all API routes are pinned to the Node.js runtime
  (`export const runtime = "nodejs"`), not Edge — `@moss-dev/moss` ships a
  native N-API addon (`.node` binary) that Edge can't load. `next.config.ts`
  also marks `@moss-dev/moss`/`@moss-dev/moss-core` as `serverExternalPackages`
  so the bundler doesn't try to webpack the native binary.
- **Platform binaries:** `@moss-dev/moss-core` ships prebuilt binaries for
  `linux-x64-gnu` and `linux-arm64-gnu` (Vercel's serverless runtime), so no
  extra build step should be needed — but this is the one part of the stack
  worth smoke-testing on the actual deployed URL before submitting, since it's
  a native addon in a serverless environment.
- **Cold starts:** the first request after a cold start pays for
  `MossClient` construction + `loadIndex()` on each index it touches. Warm
  invocations reuse both via `globalThis` (see `src/lib/moss.ts`).
- **Eval suite duration:** `/api/eval/run` calls the full pipeline (including
  an LLM call) for 16 cases sequentially — `maxDuration = 60` is set on that
  route to give it enough headroom on Vercel's default function timeout.

After deploying, update the **Live Demo URL** in your submission and in
`README.md`.
