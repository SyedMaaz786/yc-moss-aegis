import { MossClient, type SearchResult, type QueryOptions, type SessionIndex } from '@moss-dev/moss';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { embed } from './embeddings';
import knowledge from '../../data/knowledge-base.json';
import threats from '../../data/threat-patterns.json';
export const INDEXES = {
  knowledge: 'aegis-knowledge-base', threats: 'aegis-threat-patterns',
} as const;
export type MossResult = SearchResult & { mode: 'moss-local' | 'moss-cloud'; embeddingMs: number; searchMs: number };
let client: MossClient | undefined;
const sessions = new Map<string, Promise<SessionIndex>>();
const vectors = new Map<string, Map<string, number[]>>();
const loads = new Map<string, Promise<void>>();
export function getMossClient(): MossClient {
  if (!client) {
    const id = process.env.MOSS_PROJECT_ID;
    const key = process.env.MOSS_PROJECT_KEY;
    if (!id || !key) throw new Error('Moss credentials are not configured.');
    client = new MossClient(id, key, { cachePath: join(tmpdir(), 'aegis-moss-cache') });
  }
  return client;
}
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Retrieval time budget exceeded.')), ms);
    })]);
  } finally { clearTimeout(timer); }
}
async function localSession(name: string): Promise<SessionIndex> {
  let pending = sessions.get(name);
  if (!pending) {
    pending = (async () => {
      const source = name === INDEXES.knowledge ? knowledge : name === INDEXES.threats ? threats : null;
      if (!source) throw new Error('No bundled corpus for this index.');
      const session = await getMossClient().session(name + '-local-v2', 'custom');
      try {
        const docs = [];
        for (const doc of source) docs.push({ ...doc, embedding: await embed(doc.text) });
        vectors.set(name, new Map(docs.map(doc => [doc.id, doc.embedding])));
        await session.addDocs(docs);
        return session;
      } catch (error) { await session.close(); throw error; }
    })();
    sessions.set(name, pending);
    pending.catch(() => sessions.delete(name));
  }
  return pending;
}
export async function ensureLoaded(name: string): Promise<void> {
  if (!loads.has(name)) {
    const pending = getMossClient().loadIndex(name).then(() => undefined);
    loads.set(name, pending);
    pending.catch(() => loads.delete(name));
  }
  await loads.get(name);
}
// Moss's native local session performs every vector search; the bundled encoder
// supplies identically generated document/query vectors without a runtime CDN.
export async function mossQuery(name: string, query: string, options?: QueryOptions & { timeoutMs?: number }): Promise<MossResult> {
  const { timeoutMs = 12000, ...queryOptions } = options ?? {};
  return withTimeout((async () => {
    const bundled = process.env.MOSS_RETRIEVAL_MODE !== 'cloud' && (name === INDEXES.knowledge || name === INDEXES.threats);
    if (bundled) {
      const session = await localSession(name);
      const start = performance.now();
      const embedding = await embed(query);
      const embeddingMs = performance.now() - start;
      const searchStart = performance.now();
      const result = await session.query(query, { alpha: 1, ...queryOptions, embedding });
      const searchMs = performance.now() - searchStart;
      // Moss hybrid scores are rank-fusion values (top hit can always be 1).
      // Calibrate only returned candidates against the original unit vectors;
      // rank scores must never be treated as absolute safety confidence.
      const docs = result.docs.map(doc => {
        const vector = vectors.get(name)?.get(doc.id);
        const score = vector ? Math.max(0, Math.min(1, vector.reduce((sum, value, i) => sum + value * embedding[i], 0))) : 0;
        return { ...doc, score };
      });
      return { ...result, docs, mode: 'moss-local' as const, embeddingMs, searchMs };
    }
    await ensureLoaded(name);
    const start = performance.now();
    const result = await getMossClient().query(name, query, queryOptions);
    return { ...result, mode: 'moss-cloud' as const, embeddingMs: 0, searchMs: performance.now() - start };
  })(), timeoutMs);
}
