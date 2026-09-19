export type GuardrailVerdict = "allow" | "warn" | "block";
export type GroundingVerdict = "grounded" | "weak" | "ungrounded";

export interface TraceStep {
  name: "input_guardrail" | "retrieval" | "llm_generate" | "output_guardrail";
  ms: number;
  detail?: string;
}

export interface RetrievedDoc {
  id: string;
  text: string;
  score: number;
}

export interface Trace {
  id: string;
  timestamp: string;
  userMessage: string;
  steps: TraceStep[];
  totalMs: number;
  guardrailVerdict: GuardrailVerdict;
  blockedReason?: string;
  threatType?: string;
  retrievedDocs?: RetrievedDoc[];
  groundingScore?: number;
  groundingVerdict?: GroundingVerdict;
  answer?: string;
  mossRetrievalMs?: number;
}

export interface EvalCase {
  id: string;
  query: string;
  category: string;
  expectedVerdict: "allow" | "block";
  maxLatencyMs?: number;
}

export interface EvalCaseResult {
  case: EvalCase;
  actualVerdict: GuardrailVerdict;
  passed: boolean;
  groundingScore?: number;
  latencyMs: number;
  notes?: string;
}

export interface EvalReport {
  id: string;
  timestamp: string;
  totalCases: number;
  passed: number;
  failed: number;
  safetyAccuracy: number;
  avgGroundingScore: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  results: EvalCaseResult[];
}
