import { NextResponse } from "next/server";
import { getRecentTraces, getSessionStats } from "@/lib/tracing";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ traces: getRecentTraces(50), stats: getSessionStats() });
}
