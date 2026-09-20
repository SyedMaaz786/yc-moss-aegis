import { NextRequest, NextResponse } from "next/server";
import { CHAOS_AUTO_RESET_MS, isChaosMossDown, setChaosMossDown } from "@/lib/chaos";
import { isRateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ down: isChaosMossDown(), autoResetMs: CHAOS_AUTO_RESET_MS });
}

/** Demo-only toggle — see src/lib/chaos.ts. Body: { down: boolean }. */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (isRateLimited(`chaos:${ip}`)) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  setChaosMossDown(Boolean((body as { down?: unknown } | null)?.down));
  return NextResponse.json({ down: isChaosMossDown(), autoResetMs: CHAOS_AUTO_RESET_MS });
}
