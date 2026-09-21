import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const standalone = resolve('.next/standalone');
const packageRoot = resolve(standalone, 'node_modules/@huggingface/transformers');
const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
// Match the application's dynamic import, rather than testing the unused CJS entry.
const { pipeline, env } = await import(pathToFileURL(resolve(packageRoot, manifest.exports.node.import.default)).href);
env.localModelPath = resolve(standalone, 'models');
env.allowRemoteModels = false;
env.useFSCache = false;
const encoder = await pipeline('feature-extraction', 'all-MiniLM-L6-v2', {
  dtype: 'q8', device: 'cpu', session_options: { intraOpNumThreads: 1, interOpNumThreads: 1 },
});
const result = await encoder('Verify the packaged Aegis encoder.', { pooling: 'mean', normalize: true });
assert.equal(result.data.length, 384);
assert.ok(Array.from(result.data).every(Number.isFinite));
assert.ok(Math.abs(Array.from(result.data).reduce((sum, n) => sum + n * n, 0) - 1) < 0.001);
await encoder.dispose();
console.log('Standalone CPU encoder: 384 finite normalized dimensions, no remote model downloads.');
