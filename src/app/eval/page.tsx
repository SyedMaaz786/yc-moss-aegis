'use client';
import { useState } from 'react';
import type { EvalReport as Report, EvalCaseResult } from '@/lib/types';
import { EvalReport } from '@/components/EvalReport';
import { downloadJson } from '@/lib/download';
import cases from '../../../data/eval-cases.json';
export default function EvalPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [previous, setPrevious] = useState<Report | null>(null);
  const [results, setResults] = useState<EvalCaseResult[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  async function run() {
    if (running) return;
    setRunning(true); setError(''); setResults([]); setReport(null);
    try {
      try { const saved = JSON.parse(localStorage.getItem('aegis-eval-v3') ?? 'null'); if (saved?.suiteVersion === 'aegis-v3') setPrevious(saved); } catch { /* storage optional */ }
      const response = await fetch('/api/eval/run', { method: 'POST', signal: AbortSignal.timeout(125000) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error ?? 'Evaluation unavailable.'); }
      if (!response.body) throw new Error('Streaming response unavailable.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === 'progress') setResults(prev => [...prev, event.result]);
          if (event.type === 'error') throw new Error(event.error);
          if (event.type === 'complete') {
            completed = true; setReport(event.report);
            try { localStorage.setItem('aegis-eval-v3', JSON.stringify(event.report)); } catch { /* exports still work */ }
          }
        }
        if (done) break;
      }
      if (!completed) throw new Error('The run ended early. Partial results are not a completed evaluation.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Evaluation failed.'); }
    finally { setRunning(false); }
  }
  const benign = cases.filter(c => c.expectedVerdict === 'allow').length;
  return <div className="shell">
    <section className="hero"><div><div className="eyebrow text-series-1">EVALUATION / REPRODUCIBLE EVIDENCE</div><h1>Measure trust.<br/><span className="text-series-1">Find the failures.</span></h1><p className="text-sm leading-6 text-text-secondary max-w-2xl">A real answer is part of being reliable. This suite measures protection and usefulness separately, through the same pipeline as the live console.</p></div>
      <div className="flex flex-col gap-3 shrink-0"><button className="btn btn-primary" onClick={run} disabled={running}>{running ? 'Evaluating…' : 'Run evaluation suite'} <span aria-hidden>→</span></button>{report && <button className="btn" onClick={() => downloadJson(report, 'aegis-evaluation-' + report.id + '.json')}>↓ Export full report</button>}<span className="hint text-center">Live calls · typically 10–40 seconds</span></div>
    </section>
    <div className="grid sm:grid-cols-3 gap-4 mb-6">{[
      [String(cases.length), 'Versioned test cases', 'A fixed suite, open for inspection'],
      [String(cases.length - benign), 'Adversarial cases', 'Injection, jailbreaks, PII, fraud & obfuscation'],
      [String(benign), 'Benign cases', 'Policy questions and false-positive controls'],
    ].map(([n, title, detail]) => <div className="panel p-5" key={title}><div className="text-2xl font-mono text-series-1 mb-2">{n}</div><h2 className="text-sm mb-1">{title}</h2><p className="hint">{detail}</p></div>)}</div>
    {(running || error) && <section className="panel p-5 mb-6" aria-live="polite">
      <div className="flex justify-between text-sm mb-3"><span>{running ? 'Running the protected pipeline' : 'Run interrupted'}</span><span className="font-mono text-text-muted">{results.length} / {cases.length}</span></div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-series-1 transition-all" style={{ width: (results.length / cases.length * 100) + '%' }}/></div>
      {results.at(-1) && <p className="hint mt-3">{results.at(-1)?.passed ? 'PASS' : 'FAIL'} · {results.at(-1)?.case.query}</p>}
      {error && <p role="alert" className="text-status-critical text-sm mt-3">{error}</p>}
    </section>}
    {report ? <><EvalReport report={report}/>{previous && <section className="panel p-5 mt-5"><h2 className="text-sm mb-2">Compared with your previous run</h2><p className="hint">Pass count: {previous.passed}/{previous.totalCases} → {report.passed}/{report.totalCases} · p95: {previous.p95LatencyMs.toFixed(0)} → {report.p95LatencyMs.toFixed(0)} ms. Same suite version; service conditions can vary.</p></section>}</> :
      <section className="panel p-7"><div className="eyebrow text-series-1">THE SCORING CONTRACT</div><h2 className="text-xl tracking-tight mt-3 mb-5">No green score for a silent failure.</h2><div className="grid md:grid-cols-3 gap-7">
        <div><span className="tag mb-3">ATTACK BLOCKING</span><p className="hint">An adversarial case passes only when the input guardrail blocks it within its budget. A service error cannot count as protection.</p></div>
        <div><span className="tag mb-3">BENIGN SUCCESS</span><p className="hint">A benign case needs an actual released answer, trusted sources, a passing grounding signal, and acceptable latency.</p></div>
        <div><span className="tag mb-3">HONEST LIMITS</span><p className="hint">This is a small, public regression suite, not a security certification or independent benchmark. Similarity does not prove entailment.</p></div>
      </div></section>}
    <details className="panel mt-6"><summary className="p-5 cursor-pointer text-sm">Inspect all test cases <span className="text-text-muted ml-2">aegis-v3</span></summary><div className="px-5 pb-5 space-y-2">{cases.map(c => <div key={c.id} className="border-t border-border pt-3 pb-2 flex items-start gap-4 text-xs"><span className={'tag ' + (c.expectedVerdict === 'block' ? 'text-status-critical' : 'text-series-1')}>{c.expectedVerdict.toUpperCase()}</span><div><p className="leading-5">{c.query}</p><p className="hint mt-1">{c.category} · budget {c.maxLatencyMs} ms</p></div></div>)}</div></details>
  </div>;
}
