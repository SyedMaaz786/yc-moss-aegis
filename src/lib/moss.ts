import { MossClient, type SearchResult, type QueryOptions } from "@moss-dev/moss";
import { isChaosMossDown } from "./chaos";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Vercel's serverless filesystem is read-only outside /tmp. Moss's client
 * writes a stable device-id file (and index cache) under a cachePath that
 * defaults to somewhere in the working directory / home dir, which fails
 * there with "Read-only file system" — a separate bug from Moss's own
 * uptime, seen on this project's first production deploy. os.tmpdir() is
 * writable on every platform this runs on (Vercel, local dev, CI).
 */
const MOSS_CACHE_PATH = join(tmpdir(), "aegis-moss-cache");

export const INDEXES = {
  knowledge: "aegis-knowledge-base",
  threats: "aegis-threat-patterns",
  evalCases: "aegis-eval-cases",
  traces: "aegis-traces",
  evalRuns: "aegis-eval-runs",
} as const;

declare global {
  var __aegisMossClient: MossClient | undefined;
  var __aegisLoadedIndexes: Set<string> | undefined;
}

function credentials() {
  const projectId = process.env.MOSS_PROJECT_ID;
  const projectKey = process.env.MOSS_PROJECT_KEY;
  if (!projectId || !projectKey) {
    throw new Error(
      "MOSS_PROJECT_ID / MOSS_PROJECT_KEY are not set. Copy .env.example to .env.local and add your Moss credentials (free tier at https://moss.dev)."
    );
  }
  return { projectId, projectKey };
}

/**
 * Reused across warm serverless invocations via globalThis so we don't pay
 * the client-construction + index-load cost on every request.
 */
export function getMossClient(): MossClient {
  if (isChaosMossDown()) {
    throw new Error("Simulated Moss outage (chaos toggle enabled) — not a real failure.");
  }
  if (!globalThis.__aegisMossClient) {
    const { projectId, projectKey } = credentials();
    globalThis.__aegisMossClient = new MossClient(projectId, projectKey, { cachePath: MOSS_CACHE_PATH });
  }
  return globalThis.__aegisMossClient;
}

function loadedSet(): Set<string> {
  if (!globalThis.__aegisLoadedIndexes) {
    globalThis.__aegisLoadedIndexes = new Set();
  }
  return globalThis.__aegisLoadedIndexes;
}

export async function ensureLoaded(indexName: string): Promise<void> {
  const loaded = loadedSet();
  if (loaded.has(indexName)) return;
  const client = getMossClient();
  await client.loadIndex(indexName);
  loaded.add(indexName);
}

/** Default hard ceiling on a Moss round trip so a slow or hanging upstream can never blow a request's latency budget. */
const DEFAULT_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Moss call exceeded its ${timeoutMs}ms budget`)), timeoutMs)
    ),
  ]);
}

/**
 * Query an index, loading it into memory first if this warm instance hasn't
 * already. Bounded by `timeoutMs` (default 3s) end-to-end — including the
 * first-load cost — so a degraded Moss backend fails the caller's try/catch
 * fast instead of hanging the request.
 */
export async function mossQuery(
  indexName: string,
  query: string,
  options?: QueryOptions & { timeoutMs?: number }
): Promise<SearchResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...queryOptions } = options ?? {};
  return withTimeout(
    (async () => {
      await ensureLoaded(indexName);
      const client = getMossClient();
      return client.query(indexName, query, queryOptions);
    })(),
    timeoutMs
  );
}
