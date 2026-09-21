import Link from 'next/link';
export default function DemoPage() {
  return <div className="shell py-10"><div className="eyebrow text-series-1">AEGIS / TWO-MINUTE WALKTHROUGH</div><h1 className="text-4xl tracking-tight mt-3 mb-4">See the trust layer in action.</h1><p className="text-sm text-text-secondary mb-7">Recorded from the working application. Scenarios labeled SIM are controlled tests through the real protection pipeline.</p>
    <video controls preload="metadata" className="w-full rounded-xl border border-border" poster="/submission/console.png"><source src="/submission/aegis-demo.mp4" type="video/mp4"/><track kind="captions" src="/submission/demo.vtt" srcLang="en" label="English" default/>Your browser does not support video. Download the MP4 below.</video>
    <div className="flex flex-wrap gap-3 mt-5"><a className="btn" href="/submission/aegis-demo.mp4" download>↓ Download video</a><Link className="btn btn-primary" href="/">Try the live console →</Link></div>
  </div>;
}
