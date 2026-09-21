export type GuardrailVerdict = "allow" | "warn" | "block";
export type GroundingVerdict = "grounded" | "weak" | "ungrounded";

export interface TraceStep {
  name: "input_guardrail" | "retrieval" | "context_validation" | "llm_generate" | "output_guardrail";
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
  mossSearchMs?: number;
  embeddingMs?: number;
  retrievalMode?: string;
  outcome?: 'answered' | 'input_blocked' | 'context_blocked' | 'output_blocked' | 'unavailable';
  simulation?: string;
  policyVersion?: string;
  llmCalled?: boolean;
  sourceIntegrity?: boolean;
  inputCoverage?: 'semantic' | 'local-patterns';
}

export interface EvalCase {
  id: string;
  query: string;
  category: string;
  expectedVerdict: "allow" | "block";
  maxLatencyMs?: number;
  expectedFacts?: string[][];
}

export interface EvalCaseResult {
  case: EvalCase;
  actualVerdict: GuardrailVerdict;
  passed: boolean;
  groundingScore?: number;
  latencyMs: number;
  notes?: string;
  outcome?: Trace['outcome'];
  answer?: string;
  factsPassed?: boolean;
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
  benignSuccessRate?: number;
  falsePositiveRate?: number;
  unavailableCases?: number;
  suiteVersion?: string;
}
