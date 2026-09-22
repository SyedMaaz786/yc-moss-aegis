export type GuardrailVerdict = "allow" | "warn" | "block";
export type GroundingVerdict = "grounded" | "weak" | "ungrounded";
export type GenerationProvider = 'groq' | 'hidevs';
export interface GenerationAttempt {
  provider: GenerationProvider;
  model: string;
  status: 'success' | 'failed';
  ms: number;
  errorCode?: string;
}
export interface GenerationEvidence {
  provider: GenerationProvider;
  model: string;
  fallbackUsed: boolean;
  attempts: GenerationAttempt[];
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

export interface TraceStep {
  name: "input_guardrail" | "retrieval" | "context_validation" | "llm_generate" | "output_guardrail";
  status?: 'passed' | 'blocked' | 'warning' | 'unavailable';
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
  generation?: GenerationEvidence;
  generationAttempts?: GenerationAttempt[];
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
  generation?: GenerationEvidence;
  generationAttempts?: GenerationAttempt[];
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
  generationConfig?: { provider: GenerationProvider; model: string; configured: boolean }[];
}
