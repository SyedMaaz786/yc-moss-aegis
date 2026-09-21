import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchTraces } from '@/lib/tracing';
import { sessionId, sessionResponse, readJson, clientIp } from '@/lib/http';
import { isRateLimited } from '@/lib/rateLimit';
export const runtime = 'nodejs';
const schema = z.object({ query: z.string().trim().min(1).max(300) });
export async function POST(req: NextRequest) {
  if (isRateLimited('search:' + clientIp(req), 10)) return NextResponse.json({ error: 'Please wait before searching again.' }, { status: 429 });
  const parsed = schema.safeParse(await readJson(req).catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a search query.' }, { status: 400 });
  const id = sessionId(req);
  try { return sessionResponse({ result: await searchTraces(parsed.data.query, id) }, id); }
  catch { return sessionResponse({ error: 'Trace search is temporarily unavailable. Your current traces can still be exported.' }, id, 503); }
}
