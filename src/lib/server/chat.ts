import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runAgentTurn } from '@/lib/agent';
import { recordTrace } from '@/lib/tracing';
import { isRateLimited } from '@/lib/rateLimit';
import { sessionId, sessionResponse, clientIp, readJson } from '@/lib/http';
const schema = z.object({ message: z.string().trim().min(1).max(1000), scenario: z.enum(['live', 'outage', 'poisoned-context', 'fabricated-answer']).default('live') });
export async function POST(req: NextRequest) {
  if (isRateLimited('chat:' + clientIp(req))) return NextResponse.json({ error: 'Please wait a minute before trying again.' }, { status: 429 });
  const parsed = schema.safeParse(await readJson(req).catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a message between 1 and 1,000 characters and a valid scenario.' }, { status: 400 });
  const id = sessionId(req);
  try {
    const trace = await runAgentTurn(parsed.data.message, parsed.data.scenario);
    recordTrace(trace, id);
    return sessionResponse({ trace }, id);
  } catch { return sessionResponse({ error: 'The request could not complete. Please try again.' }, id, 503); }
}
