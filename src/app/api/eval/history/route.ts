import { NextResponse } from "next/server";
import { getEvalHistory } from "@/lib/evaluation";

export const runtime = "nodejs";

export async function GET() {
  const history = await getEvalHistory();
  return NextResponse.json({ history });
}
