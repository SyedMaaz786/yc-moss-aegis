'use client';
import { useEffect, useState } from 'react';
type Health = { moss: string; mode?: string; searchMs?: number; embeddingMs?: number; checkedAt?: string };
export function SystemStatusBanner() {
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const response = await fetch('/api/system/health', { cache: 'no-store', signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (active) setHealth(data);
      } catch { if (active) setHealth({ moss: 'down' }); }
    }
    void check();
    const timer = setInterval(check, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const up = health?.moss === 'up';
  return <div className="border-b border-border bg-[#0d161c]"><div className="shell flex flex-wrap gap-x-5 gap-y-1 items-center py-2 text-[11px] font-mono">
    <span className={'flex items-center gap-2 ' + (up ? 'text-series-1' : 'text-status-warning')} role="status">
      <span className={'dot ' + (!health ? 'pulse-dot' : '')}/>{!health ? 'WARMING RETRIEVAL' : up ? 'MOSS ONLINE' : 'RETRIEVAL UNAVAILABLE'}
    </span>
    <span className="text-text-muted">{up ? (health.mode === 'moss-local' ? 'Local semantic runtime · bundled MiniLM' : 'Cloud-loaded Moss index') : health ? 'The agent will decline when evidence is unavailable.' : 'Loading indexes and verifying the actual query path'}</span>
    {up && <span className="sm:ml-auto text-text-muted">Last probe: search {health.searchMs?.toFixed(2)} ms · embedding {health.embeddingMs?.toFixed(1)} ms</span>}
  </div></div>;
}
