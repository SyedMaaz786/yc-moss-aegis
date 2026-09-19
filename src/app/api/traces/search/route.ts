import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchTraces } from "@/lib/tracing";

export const runtime = "nodejs";

const bodySchema = z.object({ query: z.string().trim().min(1).max(300) });

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const result = await searchTraces(parsed.data.query, 10);
    return NextResponse.json({ result });
  } catch (err) {
    console.error("[/api/traces/search] error", err);
    return NextResponse.json({ error: "Trace search is unavailable right now." }, { status: 500 });
  }
}
