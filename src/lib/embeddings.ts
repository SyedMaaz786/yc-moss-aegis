import { join } from 'node:path';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';
let extractor: Promise<FeatureExtractionPipeline> | undefined;
export async function embed(text: string): Promise<number[]> {
  if (!extractor) {
    extractor = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.localModelPath = join(process.cwd(), 'models');
      env.allowRemoteModels = false;
      env.useFSCache = false;
      return pipeline('feature-extraction', 'all-MiniLM-L6-v2', {
        dtype: 'q8', device: 'cpu',
        session_options: { intraOpNumThreads: 1, interOpNumThreads: 1 },
      });
    })();
    extractor.catch(() => { extractor = undefined; });
  }
  const model = await extractor;
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}
