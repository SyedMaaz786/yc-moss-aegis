import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('release gates, source evidence, exports, accessibility and mobile layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Trust every turn/ })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('MOSS ONLINE');
  await page.screenshot({ path: 'artifacts/console.png', fullPage: true });

  async function scenario(name: RegExp, outcome: string) {
    const response = page.waitForResponse(r => r.url().endsWith('/api/chat') && r.request().method() === 'POST');
    await page.getByRole('button', { name }).click();
    const res = await response;
    expect(res.status()).toBe(200);
    const { trace } = await res.json();
    expect(trace.outcome).toBe(outcome);
    await expect(page.getByText('Inspecting this turn…')).toHaveCount(0);
    return trace;
  }
  const answer = await scenario(/Daily transfer limits/, 'answered');
  expect(answer.answer).toContain('5,000');
  await page.getByRole('tab', { name: /sources/i }).click();
  await expect(page.getByText('[1] kb-transfers-02', { exact: false })).toBeVisible();
  await page.screenshot({ path: 'artifacts/sources.png', fullPage: true });
  await scenario(/Prompt injection/, 'input_blocked');
  await scenario(/Poisoned context/, 'context_blocked');
  await expect(page.getByText('Context quarantined', { exact: true })).toBeVisible();
  await scenario(/Invented policy/, 'output_blocked');
  await scenario(/Retrieval outage/, 'unavailable');
  await scenario(/Refund timeline/, 'answered');
  const searchResponse = page.waitForResponse(r => r.url().endsWith('/api/traces/search'));
  await page.getByRole('button', { name: 'blocked prompt injection', exact: true }).click();
  expect((await (await searchResponse).json()).result.docs.length).toBeGreaterThan(0);

  await page.getByRole('tab', { name: 'receipt', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export decision receipt/ }).click();
  expect((await download).suggestedFilename()).toMatch(/aegis-trace-.*\.json/);
  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(a11y.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
  const mobile = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(mobile.violations.map(v => v.id)).toEqual([]);
});
test('streaming evaluation completes with honest scores', async ({ page }) => {
  await page.goto('/eval');
  await page.getByRole('button', { name: 'Run evaluation suite' }).click();
  await expect(page.getByText('32/32', { exact: true })).toBeVisible({ timeout: 100000 });
  await expect(page.getByRole('button', { name: /Export full report/ })).toBeVisible();
  await page.screenshot({ path: 'artifacts/evaluation.png', fullPage: true });
});
test('API validates input, redacts identifiers, and isolates visitors', async ({ playwright, baseURL }) => {
  const a = await playwright.request.newContext({ baseURL });
  const b = await playwright.request.newContext({ baseURL });
  expect((await a.get('/api/does-not-exist')).status()).toBe(404);
  expect((await a.get('/api/chat')).status()).toBe(405);
  expect((await a.post('/api/chat', { data: { message: ' ' } })).status()).toBe(400);
  expect((await a.post('/api/chat', { data: { message: 'a'.repeat(9000) } })).status()).toBe(400);
  expect((await a.post('/api/chat', { data: { message: 'test', scenario: 'unknown' } })).status()).toBe(400);
  const response = await a.post('/api/chat', { data: { message: 'My SSN is 123-45-6789.' } });
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).not.toContain('123-45-6789');
  // APIRequest will not send Secure cookies over plain local HTTP. Replay the
  // exact server-issued cookie to verify server isolation without weakening it.
  const cookie = response.headers()['set-cookie'].split(';')[0];
  const own = await (await a.get('/api/traces', { headers: { Cookie: cookie } })).json();
  const other = await (await b.get('/api/traces')).json();
  expect(own.traces.length).toBeGreaterThan(0);
  expect(other.traces).toHaveLength(0);
  expect(JSON.stringify(own)).not.toContain('123-45-6789');
  await a.dispose(); await b.dispose();
});
