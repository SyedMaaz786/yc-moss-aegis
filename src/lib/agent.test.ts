import { describe, expect, it, vi, beforeEach } from 'vitest';
import knowledge from '../../data/knowledge-base.json';
vi.mock('./moss', () => ({ INDEXES: { knowledge: 'kb' }, mossQuery: vi.fn() }));
vi.mock('./guardrails', () => ({ checkInput: vi.fn(), checkGrounding: vi.fn(), scanOutputForPii: vi.fn() }));
vi.mock('./llm', async importOriginal => ({ ...await importOriginal<typeof import('./llm')>(), generateCandidate: vi.fn() }));
import { runAgentTurn } from './agent';
import { mossQuery } from './moss';
import { checkInput, checkGrounding, scanOutputForPii } from './guardrails';
import { generateCandidate } from './llm';
const candidate = (text: string) => ({ text, evidence: { provider: 'groq' as const, model: 'test-model', fallbackUsed: false, attempts: [] } });
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(checkInput).mockResolvedValue({ verdict: 'allow', score: .1, latencyMs: 1, mossLatencyMs: 1 });
  vi.mocked(mossQuery).mockResolvedValue({ docs: [{ ...knowledge[0], score: .8 }], query: 'refund', mode: 'moss-local', embeddingMs: 2, searchMs: .1, timeTakenInMs: 0 });
  vi.mocked(generateCandidate).mockResolvedValue(candidate('Refunds take 5-7 business days. [1]'));
  vi.mocked(checkGrounding).mockResolvedValue({ score: .85, verdict: 'grounded', latencyMs: 1, supportingDocIds: [knowledge[0].id] });
  vi.mocked(scanOutputForPii).mockReturnValue([]);
});
describe('release gates', () => {
  it('never calls retrieval or generation for a blocked input', async () => {
    vi.mocked(checkInput).mockResolvedValue({ verdict: 'block', score: 0, latencyMs: 1 });
    const trace = await runAgentTurn('attack');
    expect(trace.outcome).toBe('input_blocked');
    expect(trace.steps).toHaveLength(1);
    expect(trace.steps[0].status).toBe('blocked');
    expect(generateCandidate).not.toHaveBeenCalled(); expect(mossQuery).not.toHaveBeenCalled();
  });
  it('withholds ungrounded candidate text', async () => {
    vi.mocked(generateCandidate).mockResolvedValue(candidate('Unsupported secret answer.'));
    vi.mocked(checkGrounding).mockResolvedValue({ score: 0, verdict: 'ungrounded', latencyMs: 1, supportingDocIds: [] });
    const trace = await runAgentTurn('refund?');
    expect(trace.outcome).toBe('output_blocked');
    expect(trace.steps.at(-1)?.status).toBe('blocked');
    expect(JSON.stringify(trace)).not.toContain('Unsupported secret answer');
  });
  it('withholds PII and invented amounts even with a high grounding score', async () => {
    vi.mocked(generateCandidate).mockResolvedValue(candidate('Guaranteed refund of $99999.'));
    expect((await runAgentTurn('refund?')).outcome).toBe('output_blocked');
    vi.mocked(generateCandidate).mockResolvedValue(candidate('123-45-6789'));
    vi.mocked(scanOutputForPii).mockReturnValue(['ssn']);
    expect(JSON.stringify(await runAgentTurn('refund?'))).not.toContain('123-45-6789');
  });
  it('quarantines poisoned context before generation', async () => {
    const trace = await runAgentTurn('refund?', 'poisoned-context');
    expect(trace.outcome).toBe('context_blocked');
    expect(trace.steps.at(-1)?.status).toBe('blocked');
    expect(generateCandidate).not.toHaveBeenCalled();
  });
  it('keeps outage simulation isolated to that request', async () => {
    const trace = await runAgentTurn('refund?', 'outage');
    expect(trace.outcome).toBe('unavailable');
    expect(trace.steps.at(-1)?.status).toBe('unavailable');
    expect(generateCandidate).not.toHaveBeenCalled();
    expect((await runAgentTurn('refund?')).outcome).toBe('answered');
  });
  it('treats an empty retrieval as unavailable, without alleging source tampering', async () => {
    vi.mocked(mossQuery).mockResolvedValue({ docs: [], query: 'unknown', mode: 'moss-local', embeddingMs: 2, searchMs: .1, timeTakenInMs: 2.1 });
    const trace = await runAgentTurn('unknown policy?');
    expect(trace.outcome).toBe('unavailable');
    expect(trace.threatType).toBeUndefined();
    expect(trace.steps.at(-1)?.status).toBe('unavailable');
    expect(trace.steps.some(s => s.name === 'context_validation')).toBe(false);
    expect(generateCandidate).not.toHaveBeenCalled();
  });
  it('records failed generation as unavailable, never answered', async () => {
    vi.mocked(generateCandidate).mockRejectedValue(new Error('provider down'));
    expect((await runAgentTurn('refund?')).outcome).toBe('unavailable');
    expect(checkGrounding).not.toHaveBeenCalled();
  });
  it('checks a fallback candidate with the same release gates and retains only provenance', async () => {
    vi.mocked(generateCandidate).mockResolvedValue({ text: 'Unsupported fallback candidate.', evidence: {
      provider: 'hidevs', model: 'gemini-3.5-flash-lite', fallbackUsed: true,
      attempts: [{ provider: 'groq', model: 'test-model', status: 'failed', ms: 1, errorCode: 'http_503' },
        { provider: 'hidevs', model: 'gemini-3.5-flash-lite', status: 'success', ms: 2 }],
    } });
    vi.mocked(checkGrounding).mockResolvedValue({ score: 0, verdict: 'ungrounded', latencyMs: 1, supportingDocIds: [] });
    const trace = await runAgentTurn('refund?');
    expect(trace.outcome).toBe('output_blocked');
    expect(trace.generation?.fallbackUsed).toBe(true);
    expect(trace.generation?.attempts).toHaveLength(2);
    expect(JSON.stringify(trace)).not.toContain('Unsupported fallback candidate');
    expect(generateCandidate).toHaveBeenCalledTimes(1);
  });
});
