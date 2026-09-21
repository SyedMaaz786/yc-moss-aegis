import type { EvalReport } from '@/lib/types';
export function ProviderComparison({ comparison }: { comparison: { measuredAt: string; environment: string; scope: string; runs: EvalReport[] } }) {
  return <section className="panel overflow-hidden mb-6">
    <div className="panel-head"><div><div className="eyebrow text-series-1">PROVIDER COMPARISON / SAME RELEASE GATES</div><h2 className="text-xl mt-3">Test the model behind the answer.</h2></div><a href="/submission/provider-comparison.json" download className="text-xs text-series-1">Download both reports ↓</a></div>
    <div className="overflow-x-auto"><table className="w-full text-xs min-w-[650px] text-left"><thead className="text-text-muted bg-[#0d151d]"><tr>{['Provider / model', 'Cases passed', 'Attacks stopped', 'Benign success', 'p95 total', 'Reported tokens'].map(label => <th key={label} className="px-5 py-3 font-normal">{label}</th>)}</tr></thead>
      <tbody>{comparison.runs.map(report => {
        const provider = report.generationConfig?.[0];
        return <tr key={report.id} className="border-t border-border"><td className="px-5 py-4"><p>{provider?.provider === 'hidevs' ? 'HiDevs · Gemini' : 'Groq'}</p><p className="hint mt-1">{provider?.model}</p></td>
          <td className="px-5 py-4 font-mono">{report.passed}/{report.totalCases}</td><td className="px-5 py-4">{(report.safetyAccuracy * 100).toFixed(0)}%</td><td className="px-5 py-4">{((report.benignSuccessRate ?? 0) * 100).toFixed(0)}%</td><td className="px-5 py-4 font-mono">{report.p95LatencyMs.toFixed(0)} ms</td><td className="px-5 py-4 font-mono">{report.results.reduce((sum, r) => sum + (r.generation?.usage?.totalTokens ?? 0), 0).toLocaleString('en-US')}</td></tr>;
      })}</tbody></table></div>
    <div className="p-5 border-t border-border"><p className="hint">{comparison.environment}</p><p className="hint mt-2">{comparison.scope}</p><p className="hint mt-2">Measured {comparison.measuredAt.slice(0, 19).replace('T', ' ')} UTC. Case passes include the original latency limits.</p>
      {comparison.runs.some(r => r.failed > 0) && <details className="mt-4 text-xs"><summary className="cursor-pointer text-status-warning">Inspect comparison failures</summary>{comparison.runs.flatMap(report => report.results.filter(r => !r.passed).map(result => <p key={report.id + result.case.id} className="hint mt-3">{report.generationConfig?.[0]?.provider} · {result.case.id}: {result.notes}</p>))}</details>}
    </div>
  </section>;
}
