import { NextRequest, NextResponse } from 'next/server';
import { runEvalSuite } from '@/lib/evaluation';
import { isRateLimited } from '@/lib/rateLimit';
import { clientIp, isSameOrigin } from '@/lib/http';
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
  if (isRateLimited('eval:' + clientIp(req), 2)) return NextResponse.json({ error: 'Two evaluation runs per minute are available. Please wait.' }, { status: 429 });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: unknown) => { if (!closed) try { controller.enqueue(encoder.encode(JSON.stringify(event) + '\n')); } catch { closed = true; } };
      try {
        const report = await runEvalSuite((result, completed, total) => send({ type: 'progress', result, completed, total }));
        send({ type: 'complete', report });
      } catch { send({ type: 'error', error: 'Evaluation interrupted. Partial results are not a completed score.' }); }
      finally { if (!closed) controller.close(); }
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
