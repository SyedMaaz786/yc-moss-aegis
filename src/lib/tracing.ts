import { getMossClient, withTimeout } from './moss';
import { embed } from './embeddings';
import { redactSensitive } from './privacy';
import type { Trace } from './types';
declare global { var __aegisPrivateSessions: Map<string, { traces: Trace[]; updated: number }> | undefined; }
const sessions = globalThis.__aegisPrivateSessions ??= new Map<string, { traces: Trace[]; updated: number }>();
export function recordTrace(trace: Trace, session: string): void {
  for (const [id, item] of sessions) if (Date.now() - item.updated > 3600000) sessions.delete(id);
  if (sessions.size >= 200 && !sessions.has(session)) sessions.delete(sessions.keys().next().value!);
  const traces = sessions.get(session)?.traces ?? [];
  traces.unshift({ ...trace, userMessage: redactSensitive(trace.userMessage), answer: trace.answer ? redactSensitive(trace.answer) : undefined });
  sessions.set(session, { traces: traces.slice(0, 50), updated: Date.now() });
}
export function getRecentTraces(session: string): Trace[] {
  const item = sessions.get(session);
  if (!item || Date.now() - item.updated > 3600000) return [];
  return item.traces;
}
export function getSessionStats(session: string) {
  const traces = getRecentTraces(session);
  const blocked = traces.filter(t => t.guardrailVerdict === 'block').length;
  const warned = traces.filter(t => t.guardrailVerdict === 'warn').length;
  return { total: traces.length, blocked, warned, allowed: traces.length - blocked - warned,
    avgLatencyMs: traces.length ? traces.reduce((sum, t) => sum + t.totalMs, 0) / traces.length : 0 };
}
export async function searchTraces(query: string, sessionId: string) {
  const traces = getRecentTraces(sessionId);
  if (!traces.length) return { docs: [], timeTakenInMs: 0 };
  return withTimeout((async () => {
    const session = await getMossClient().session('trace-search-' + sessionId, 'custom');
    try {
      const docs = [];
      for (const t of traces) {
        const text = [t.userMessage, t.outcome, t.threatType, t.blockedReason].filter(Boolean).join(' ');
        docs.push({ id: t.id, text, embedding: await embed(text), metadata: { verdict: t.guardrailVerdict } });
      }
      await session.addDocs(docs);
      return await session.query(redactSensitive(query), { embedding: await embed(redactSensitive(query)), topK: 5 });
    } finally { await session.close(); }
  })(), 10000);
}
