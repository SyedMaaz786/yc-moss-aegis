import { createHash } from 'node:crypto';
import knowledge from '../../data/knowledge-base.json';
import type { RetrievedDoc } from './types';
export const POLICY_VERSION = 'northbridge-2026-09-v2';
const fingerprint = (text: string) => createHash('sha256').update(text).digest('hex');
const manifest = new Map(knowledge.map(doc => [doc.id, fingerprint(doc.text)]));
export function validateContext(docs: RetrievedDoc[]) {
  const rejected = docs.filter(doc => manifest.get(doc.id) !== fingerprint(doc.text));
  return { trusted: rejected.length === 0 && docs.length > 0, rejectedIds: rejected.map(d => d.id) };
}
// A conservative numerical check supplements semantic overlap, not entailment.
export function unsupportedNumbers(answer: string, docs: RetrievedDoc[]): string[] {
  const tokens = (text: string) => text.replace(/\[\d+\]/g, '').match(/\$?\d[\d,]*(?:\.\d+)?%?/g) ?? [];
  const normalize = (value: string) => value.replace(/[$,]/g, '');
  const source = new Set(docs.flatMap(d => tokens(d.text).map(normalize)));
  return tokens(answer).filter(n => !source.has(normalize(n)));
}
