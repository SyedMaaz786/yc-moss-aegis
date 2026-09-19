import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runAgentTurn } from "@/lib/agent";
import { isRateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a moment before sending another message." },
      { status: 429 }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request: message is required (1-1000 chars)." }, { status: 400 });
  }

  try {
    const trace = await runAgentTurn(parsed.data.message);
    return NextResponse.json({ trace });
  } catch (err) {
    console.error("[/api/chat] error", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
