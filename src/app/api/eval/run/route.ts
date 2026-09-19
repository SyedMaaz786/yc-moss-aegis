import { NextResponse } from "next/server";
import { runEvalSuite } from "@/lib/evaluation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  try {
    const report = await runEvalSuite();
    return NextResponse.json({ report });
  } catch (err) {
    console.error("[/api/eval/run] error", err);
    const message = err instanceof Error ? err.message : "Eval run failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
