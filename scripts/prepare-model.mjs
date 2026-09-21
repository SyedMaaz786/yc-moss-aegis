import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
const root = join(process.cwd(), 'models', 'all-MiniLM-L6-v2');
const revision = '751bff37182d3f1213fa05d7196b954e230abad9';
for (const file of ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'onnx/model_quantized.onnx']) {
  const target = join(root, file);
  if (existsSync(target)) continue;
  const response = await fetch('https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/' + revision + '/' + file, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(file + ': ' + response.status);
  await mkdir(join(target, '..'), { recursive: true });
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
  console.log('Prepared', file);
}
await writeFile(join(root, 'provenance.json'), JSON.stringify({ model: 'Xenova/all-MiniLM-L6-v2', revision, dtype: 'q8', license: 'Apache-2.0' }, null, 2));
