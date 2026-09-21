import { NextResponse } from 'next/server';
import { mossQuery, INDEXES } from '@/lib/moss';
export const runtime = 'nodejs';
export const maxDuration = 60;
let cached: { data: object; expires: number } | undefined;
export async function GET() {
  if (cached && cached.expires > Date.now()) return NextResponse.json(cached.data, { headers: { 'Cache-Control': 'no-store' } });
  const start = performance.now();
  let data;
  try {
    const result = await mossQuery(INDEXES.knowledge, 'daily transfer limits', { topK: 1 });
    await mossQuery(INDEXES.threats, 'security check', { topK: 1 });
    data = { moss: 'up', mode: result.mode, roundTripMs: performance.now() - start, mossReportedMs: result.timeTakenInMs,
      searchMs: result.searchMs, embeddingMs: result.embeddingMs, generationConfigured: Boolean(process.env.GROQ_API_KEY), checkedAt: new Date().toISOString() };
  } catch { data = { moss: 'down', error: 'Retrieval is unavailable. Requests will fail safely.', checkedAt: new Date().toISOString() }; }
  cached = { data, expires: Date.now() + 15000 };
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
