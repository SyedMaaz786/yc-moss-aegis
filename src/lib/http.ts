import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
export function sessionId(req: NextRequest): string {
  const existing = req.cookies.get('aegis-session')?.value;
  return existing && /^[0-9a-f-]{36}$/.test(existing) ? existing : randomUUID();
}
export function sessionResponse(body: unknown, id: string, status = 200) {
  const response = NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set('aegis-session', id, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400 });
  return response;
}
export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.get('host'); } catch { return false; }
}
export async function readJson(req: NextRequest): Promise<unknown> {
  if (!isSameOrigin(req)) throw new Error('Cross-origin request rejected.');
  if (!req.body) return null;
  const reader = req.body.getReader();
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 8192) { await reader.cancel(); throw new Error('Request too large.'); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
