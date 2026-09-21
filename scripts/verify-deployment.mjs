import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'https://yc-moss-aegis.vercel.app';
for (const path of ['/', '/eval', '/evidence', '/demo', '/submission/PRD.pdf', '/submission/architecture.pdf',
  '/submission/architecture.svg', '/submission/evaluation.json', '/submission/provider-comparison.json', '/submission/failover.json', '/submission/aegis-demo.mp4', '/submission/demo.vtt']) {
  const response = await fetch(baseURL + path, { method: 'HEAD', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, path);
  console.log(response.status, path, response.headers.get('content-type'));
}
const response = await fetch(baseURL + '/api/system/health', { signal: AbortSignal.timeout(60000) });
const health = await response.json();
assert.equal(health.moss, 'up');
assert.equal(health.mode, 'moss-local');
assert.equal(health.generationConfigured, true);
assert.equal(health.generationProviders[0].provider, 'groq');
assert.ok(health.generationProviders.some(p => p.provider === 'hidevs' && p.configured));
console.log('Live health:', JSON.stringify(health));

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(baseURL + '/demo');
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 1);
  const duration = await page.locator('video').evaluate(video => video.duration);
  assert.ok(duration >= 119 && duration <= 121, 'Demo should be two minutes.');
  console.log('Browser decoded demo metadata:', duration, 'seconds');
  await page.goto(baseURL + '/evidence');
  await page.getByRole('heading', { name: 'Test the model behind the answer.' }).waitFor();
  await page.getByRole('heading', { name: 'Recovery without bypassing the release gate' }).waitFor();
  await page.screenshot({ path: 'artifacts/provider-comparison.png', fullPage: true });
} finally { await browser.close(); }
