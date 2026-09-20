import { NextResponse } from "next/server";
import { mossQuery, INDEXES } from "@/lib/moss";
import { isChaosMossDown } from "@/lib/chaos";

export const runtime = "nodejs";

/**
 * Live health probe for the Moss retrieval layer itself, surfaced in the UI
 * as a banner. Uses the same cached `ensureLoaded` path as real traffic (not
 * a separate "ping" mechanism), so this reports exactly what the agent is
 * actually experiencing — including a real failover event if Moss's model
 * CDN or query path is unreachable, which the guardrail pipeline already
 * degrades gracefully around (see src/lib/agent.ts, src/lib/guardrails.ts).
 */
export async function GET() {
  const start = performance.now();
  try {
    const result = await Promise.race([
      mossQuery(INDEXES.threats, "system health check", { topK: 1 }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Moss query timed out after 4s")), 4000)),
    ]);
    return NextResponse.json({
      moss: "up",
      roundTripMs: Math.round(performance.now() - start),
      mossReportedMs: result.timeTakenInMs,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      moss: "down",
      simulated: isChaosMossDown(),
      error: err instanceof Error ? err.message : "Unknown Moss error",
      checkedAt: new Date().toISOString(),
    });
  }
}
