import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateCandidate, GenerationUnavailableError, getGenerationSettings } from './llm';
const request = vi.fn<typeof fetch>();
const complete = () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'Policy answer. [1]' } }], usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25 } });
beforeEach(() => {
  vi.stubGlobal('fetch', request); request.mockReset();
  vi.stubEnv('GROQ_API_KEY', 'test-groq-credential'); vi.stubEnv('HIDEVS_API_KEY', 'test-hidevs-credential');
  vi.stubEnv('GROQ_MODEL', 'openai/gpt-oss-20b'); vi.stubEnv('HIDEVS_MODEL', 'gemini-3.5-flash-lite');
  vi.stubEnv('LLM_PROVIDER', 'groq'); vi.stubEnv('LLM_FALLBACK_PROVIDER', 'none');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('generation provider boundary', () => {
  it('sends each credential only to its provider and omits Groq-only options for Gemini', async () => {
    request.mockImplementation(async () => complete());
    await generateCandidate('Policy', 'Question');
    const result = await generateCandidate('Policy', 'Question', { provider: 'hidevs', fallback: null });
    expect(request.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(request.mock.calls[1][0]).toBe('https://llm.hidevs.xyz/v1/chat/completions');
    expect(request.mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer test-hidevs-credential' });
    expect(request.mock.calls[1][1]?.redirect).toBe('error');
    expect(JSON.parse(request.mock.calls[1][1]?.body as string)).not.toHaveProperty('reasoning_effort');
    expect(result.evidence.usage?.totalTokens).toBe(25);
    expect(result.evidence.provider).toBe('hidevs');
    expect(JSON.stringify(getGenerationSettings())).not.toContain('credential');
  });
  it('uses one backup on primary failure and records both attempts without server response text', async () => {
    request.mockResolvedValueOnce(new Response('private upstream diagnostic', { status: 503 })).mockResolvedValueOnce(complete());
    const result = await generateCandidate('Policy', 'Question', { fallback: 'hidevs' });
    expect(result.evidence.fallbackUsed).toBe(true);
    expect(result.evidence.attempts.map(a => a.status)).toEqual(['failed', 'success']);
    expect(result.evidence.attempts[0].errorCode).toBe('http_503');
    expect(JSON.stringify(result)).not.toContain('private upstream diagnostic');
  });
  it('does not retry or switch providers when fallback is disabled', async () => {
    request.mockResolvedValue(new Response('', { status: 429 }));
    await expect(generateCandidate('Policy', 'Question')).rejects.toBeInstanceOf(GenerationUnavailableError);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('rejects truncated content even when the upstream supplied some text', async () => {
    request.mockResolvedValue(Response.json({ choices: [{ finish_reason: 'length', message: { content: 'A partial policy' } }] }));
    await expect(generateCandidate('Policy', 'Question')).rejects.toMatchObject({ attempts: [{ errorCode: 'incomplete_answer' }] });
  });
  it('rejects an empty successful response', async () => {
    request.mockResolvedValue(Response.json({ choices: [{ finish_reason: 'stop', message: { content: ' ' } }] }));
    await expect(generateCandidate('Policy', 'Question')).rejects.toMatchObject({ attempts: [{ errorCode: 'invalid_response' }] });
  });
  it('never sends a request without a configured key', async () => {
    vi.stubEnv('GROQ_API_KEY', '');
    await expect(generateCandidate('Policy', 'Question')).rejects.toMatchObject({ attempts: [{ errorCode: 'not_configured' }] });
    expect(request).not.toHaveBeenCalled();
  });
  it('can recover from a primary timeout and keeps timeout provenance', async () => {
    request.mockRejectedValueOnce(new DOMException('Timeout', 'TimeoutError')).mockResolvedValueOnce(complete());
    const result = await generateCandidate('Policy', 'Question', { fallback: 'hidevs' });
    expect(result.evidence.attempts[0].errorCode).toBe('timeout');
    expect(request.mock.calls.every(([, options]) => options?.signal instanceof AbortSignal)).toBe(true);
  });
  it('exhausts at most two providers and sanitizes the aggregate failure', async () => {
    request.mockResolvedValue(new Response('test-hidevs-credential', { status: 502 }));
    let failure;
    try { await generateCandidate('Policy', 'Question', { fallback: 'hidevs' }); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(GenerationUnavailableError);
    expect(request).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(failure)).not.toContain('credential');
  });
  it('rejects unsupported provider configuration before sending a credential', async () => {
    vi.stubEnv('LLM_PROVIDER', 'untrusted');
    await expect(generateCandidate('Policy', 'Question')).rejects.toThrow('Unsupported generation provider');
    expect(request).not.toHaveBeenCalled();
  });
});
