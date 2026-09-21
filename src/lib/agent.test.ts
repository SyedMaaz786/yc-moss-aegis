import { describe, expect, it, vi, beforeEach } from 'vitest';
import knowledge from '../../data/knowledge-base.json';
vi.mock('./moss', () => ({ INDEXES: { knowledge: 'kb' }, mossQuery: vi.fn() }));
vi.mock('./guardrails', () => ({ checkInput: vi.fn(), checkGrounding: vi.fn(), scanOutputForPii: vi.fn() }));
vi.mock('./llm', () => ({ generateAnswer: vi.fn() }));
import { runAgentTurn } from './agent';
import { mossQuery } from './moss';
import { checkInput, checkGrounding, scanOutputForPii } from './guardrails';
import { generateAnswer } from './llm';
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(checkInput).mockResolvedValue({ verdict: 'allow', score: .1, latencyMs: 1, mossLatencyMs: 1 });
  vi.mocked(mossQuery).mockResolvedValue({ docs: [{ ...knowledge[0], score: .8 }], query: 'refund', mode: 'moss-local', embeddingMs: 2, searchMs: .1, timeTakenInMs: 0 });
  vi.mocked(generateAnswer).mockResolvedValue('Refunds take 5-7 business days. [1]');
  vi.mocked(checkGrounding).mockResolvedValue({ score: .85, verdict: 'grounded', latencyMs: 1, supportingDocIds: [knowledge[0].id] });
  vi.mocked(scanOutputForPii).mockReturnValue([]);
});
describe('release gates', () => {
  it('never calls retrieval or generation for a blocked input', async () => {
    vi.mocked(checkInput).mockResolvedValue({ verdict: 'block', score: 0, latencyMs: 1 });
    expect((await runAgentTurn('attack')).outcome).toBe('input_blocked');
    expect(generateAnswer).not.toHaveBeenCalled(); expect(mossQuery).not.toHaveBeenCalled();
  });
  it('withholds ungrounded candidate text', async () => {
    vi.mocked(generateAnswer).mockResolvedValue('Unsupported secret answer.');
    vi.mocked(checkGrounding).mockResolvedValue({ score: 0, verdict: 'ungrounded', latencyMs: 1, supportingDocIds: [] });
    const trace = await runAgentTurn('refund?');
    expect(trace.outcome).toBe('output_blocked');
    expect(JSON.stringify(trace)).not.toContain('Unsupported secret answer');
  });
  it('withholds PII and invented amounts even with a high grounding score', async () => {
    vi.mocked(generateAnswer).mockResolvedValue('Guaranteed refund of $99999.');
    expect((await runAgentTurn('refund?')).outcome).toBe('output_blocked');
    vi.mocked(generateAnswer).mockResolvedValue('123-45-6789');
    vi.mocked(scanOutputForPii).mockReturnValue(['ssn']);
    expect(JSON.stringify(await runAgentTurn('refund?'))).not.toContain('123-45-6789');
  });
  it('quarantines poisoned context before generation', async () => {
    expect((await runAgentTurn('refund?', 'poisoned-context')).outcome).toBe('context_blocked');
    expect(generateAnswer).not.toHaveBeenCalled();
  });
  it('keeps outage simulation isolated to that request', async () => {
    expect((await runAgentTurn('refund?', 'outage')).outcome).toBe('unavailable');
    expect(generateAnswer).not.toHaveBeenCalled();
    expect((await runAgentTurn('refund?')).outcome).toBe('answered');
  });
  it('records failed generation as unavailable, never answered', async () => {
    vi.mocked(generateAnswer).mockRejectedValue(new Error('provider down'));
    expect((await runAgentTurn('refund?')).outcome).toBe('unavailable');
    expect(checkGrounding).not.toHaveBeenCalled();
  });
});
