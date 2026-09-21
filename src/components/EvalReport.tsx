import { useState } from 'react';
import type { EvalReport as Report } from '@/lib/types';
export function EvalReport({ report }: { report: Report }) {
  const [failedOnly, setFailedOnly] = useState(false);
  const categories = [...new Set(report.results.map(r => r.case.category))];
  const percent = (n = 0) => (n * 100).toFixed(0) + '%';
  const metrics = [
    [report.passed + '/' + report.totalCases, 'Cases passed', 'All correctness and latency gates'],
    [percent(report.safetyAccuracy), 'Attack blocking', 'Adversarial inputs stopped'],
    [percent(report.benignSuccessRate), 'Benign success', 'Useful, verified answers released'],
    [percent(report.falsePositiveRate), 'False positives', 'Benign inputs incorrectly blocked'],
  ];
  return <div>
    {report.generationConfig && <p className="hint mb-4">Generation: {report.generationConfig.map((p, i) => (i ? 'backup ' : '') + p.provider + ' / ' + p.model).join(' → ')}. Each case records the provider actually used.</p>}
    <div className="metrics">{metrics.map(([value, label, note]) => <div key={label} className="metric"><div className="eyebrow">{label}</div><div className="metric-value">{value}</div><p className="hint">{note}</p></div>)}</div>
    <div className="panel p-5 mb-5 flex flex-wrap gap-6 justify-between text-xs">
      <span className="text-text-muted">p95 total <strong className="text-text-primary ml-2">{report.p95LatencyMs.toFixed(0)} ms</strong></span>
      <span className="text-text-muted">Unavailable <strong className="text-text-primary ml-2">{report.unavailableCases ?? 0} cases</strong></span>
      <span className="text-text-muted">Average grounding signal <strong className="text-text-primary ml-2">{report.avgGroundingScore.toFixed(3)}</strong></span>
      <span className="text-text-muted">Suite <strong className="text-text-primary ml-2">{report.suiteVersion}</strong></span>
    </div>
    <div className="panel p-5 mb-5"><h2 className="text-sm mb-4">Coverage by category</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">{categories.map(category => {
      const rows = report.results.filter(r => r.case.category === category);
      const passed = rows.filter(r => r.passed).length;
      return <div key={category}><div className="flex justify-between gap-4 text-xs mb-2"><span className="text-text-secondary">{category.replaceAll('_', ' ')}</span><span className="font-mono">{passed}/{rows.length}</span></div><div className="h-1 rounded-full bg-surface-2"><div className={'h-full rounded-full ' + (passed === rows.length ? 'bg-series-1' : 'bg-status-warning')} style={{ width: (passed / rows.length * 100) + '%' }}/></div></div>;
    })}</div></div>
    <div className="panel overflow-hidden"><div className="panel-head"><h2 className="text-sm">Case-by-case evidence</h2><label className="text-xs text-text-secondary flex gap-2"><input type="checkbox" checked={failedOnly} onChange={e => setFailedOnly(e.target.checked)}/>Failures only</label></div>
      <div className="overflow-x-auto"><table className="w-full text-xs min-w-[640px] text-left">
        <thead className="text-text-muted bg-[#0d151d]"><tr>{['Result', 'Query', 'Outcome', 'Latency'].map(h => <th className="px-5 py-3 font-normal" key={h}>{h}</th>)}</tr></thead>
        <tbody>{report.results.filter(r => !failedOnly || !r.passed).map(r => <tr key={r.case.id} className="border-t border-border"><td className={'px-5 py-4 font-mono ' + (r.passed ? 'text-series-1' : 'text-status-critical')}>{r.passed ? 'PASS' : 'FAIL'}</td><td className="px-5 py-4 max-w-md"><p className="leading-5">{r.case.query}</p>{r.notes && <p className="text-status-warning leading-5 mt-1">{r.notes}</p>}{r.case.expectedFacts && <details className="mt-2 text-text-muted"><summary className="cursor-pointer">Policy fact checks {r.factsPassed ? 'passed' : 'failed'}</summary><p className="mt-2 leading-5">{r.answer}</p></details>}</td><td className="px-5 py-4 text-text-muted">{r.outcome?.replaceAll('_', ' ')}</td><td className="px-5 py-4 text-text-secondary font-mono whitespace-nowrap">{r.latencyMs.toFixed(1)} ms</td></tr>)}</tbody>
      </table></div>{failedOnly && report.failed === 0 && <p className="hint p-6">No failures in this run.</p>}
    </div><p className="hint mt-3">Measured {new Date(report.timestamp).toLocaleString()} · {report.id} · An observed run, not a guarantee for unseen inputs.</p>
  </div>;
}
