import { MossClient, type SearchResult, type QueryOptions } from "@moss-dev/moss";

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
  if (!globalThis.__aegisMossClient) {
    const { projectId, projectKey } = credentials();
    globalThis.__aegisMossClient = new MossClient(projectId, projectKey);
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

/** Query an index, loading it into memory first if this warm instance hasn't already. */
export async function mossQuery(
  indexName: string,
  query: string,
  options?: QueryOptions
): Promise<SearchResult> {
  await ensureLoaded(indexName);
  const client = getMossClient();
  return client.query(indexName, query, options);
}
