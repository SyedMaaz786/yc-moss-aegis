import { NextRequest, NextResponse } from 'next/server';
import { POST as chat } from '@/lib/server/chat';
import { POST as evaluate } from '@/lib/server/evaluate';
import { GET as health } from '@/lib/server/health';
import { GET as traces } from '@/lib/server/traces';
import { POST as search } from '@/lib/server/search';

// One function shares the native model and temporary traces across API routes.
// Separate serverless functions cannot share in-process session memory.
export const runtime = 'nodejs';
export const maxDuration = 120;
type Handler = (request: NextRequest) => Promise<Response>;
const routes: Record<string, { GET?: Handler; POST?: Handler }> = {
  '/api/chat': { POST: chat },
  '/api/eval/run': { POST: evaluate },
  '/api/system/health': { GET: health },
  '/api/traces': { GET: traces },
  '/api/traces/search': { POST: search },
};
async function dispatch(request: NextRequest) {
  const route = routes[request.nextUrl.pathname.replace(/\/$/, '')];
  if (!route) return NextResponse.json({ error: 'Unknown API endpoint.' }, { status: 404 });
  const handler = route[request.method as 'GET' | 'POST'];
  if (!handler) return NextResponse.json({ error: 'Method not allowed.' }, { status: 405, headers: { Allow: Object.keys(route).join(', ') } });
  return handler(request);
}
export const GET = dispatch;
export const POST = dispatch;
