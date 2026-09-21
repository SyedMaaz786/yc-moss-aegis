import { NextRequest } from 'next/server';
import { getRecentTraces, getSessionStats } from '@/lib/tracing';
import { sessionId, sessionResponse } from '@/lib/http';
export async function GET(req: NextRequest) {
  const id = sessionId(req);
  return sessionResponse({ traces: getRecentTraces(id), stats: getSessionStats(id), retention: 'Temporary, per browser session; export to keep a copy.' }, id);
}
