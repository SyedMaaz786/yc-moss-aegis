import Link from 'next/link';
import chapters from '../../../data/demo-guide.json';

function timestamp(seconds: number) {
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

export default function DemoPage() {
  const total = chapters.reduce((sum, chapter) => sum + chapter.duration, 0);
  return <div className="shell py-10">
    <div className="eyebrow text-series-1">AEGIS / WALKTHROUGH & RECORDING GUIDE</div>
    <div className="flex flex-wrap justify-between gap-6 items-end mb-7">
      <div><h1 className="text-4xl tracking-tight mt-3 mb-4">Show the decision.<br/><span className="text-series-1">Then show the evidence.</span></h1>
        <p className="text-sm text-text-secondary leading-6 max-w-2xl">A {timestamp(total)} reference walkthrough of the working application, with synthetic narration and captions. Scenarios labeled SIM are controlled tests through the real protection pipeline.</p></div>
      <a className="btn" href="#rehearsal">Open the rehearsal plan ↓</a>
    </div>
    <video controls preload="metadata" aria-label="Aegis reference walkthrough" className="w-full rounded-xl border border-border" poster="/submission/console.png">
      <source src="/submission/aegis-demo.mp4" type="video/mp4"/>
      <track kind="captions" src="/submission/demo.vtt" srcLang="en" label="English" default/>
      Your browser does not support video. Download the MP4 below.
    </video>
    <div className="flex flex-wrap gap-3 mt-5"><a className="btn" href="/submission/aegis-demo.mp4" download>↓ Download reference video</a><Link className="btn btn-primary" href="/">Try the live console →</Link></div>
    <section className="panel p-6 my-8" aria-labelledby="recording-requirements">
      <div className="eyebrow text-series-1">YOUR SUBMISSION RECORDING</div>
      <h2 id="recording-requirements" className="text-xl mt-3 mb-3">Use your own screen, camera, and voice.</h2>
      <p className="hint max-w-3xl">The updated HiDevs form requires a recording of 1–7 minutes inside the submission portal. Use this video to rehearse, then demonstrate the app yourself. The plan below takes about {timestamp(total)}; leave room for live requests to finish.</p>
      <ol className="list-decimal pl-5 text-sm text-text-secondary leading-7 mt-4 space-y-2">
        <li>Open the console, evaluation, and evidence in separate tabs. Run one normal question to warm the app, then reload the console for a clean view.</li>
        <li>In HiDevs, start recording and allow your camera and microphone. Choose <strong className="text-text-primary">Entire Screen or Window</strong> in the browser picker; a single Chrome tab will not capture your demo tab switches.</li>
        <li>Keep the submission page open while you demonstrate the app. After at least one minute, return to it and use <strong className="text-text-primary">Submit recording</strong>. Do not close or reload the page, or stop sharing before saving the take.</li>
      </ol>
    </section>
    <section id="rehearsal" className="scroll-mt-8" aria-labelledby="rehearsal-title">
      <div className="flex flex-wrap justify-between gap-4 items-end mb-5"><div><div className="eyebrow text-series-1">TEN CHAPTERS / {timestamp(total)} PLANNED</div><h2 id="rehearsal-title" className="text-2xl mt-3">Your rehearsal plan</h2></div><p className="hint max-w-md">Introduce yourself in your own words. These talking points explain the implementation; describe the live results you actually see.</p></div>
      <div className="space-y-4">{chapters.map((chapter, index) => {
        const start = chapters.slice(0, index).reduce((sum, item) => sum + item.duration, 0);
        return <article key={chapter.title} className="panel p-5 md:p-6">
          <div className="flex flex-wrap justify-between gap-3 mb-4"><div className="flex items-center gap-3"><span className="tag font-mono text-series-1">{timestamp(start)}–{timestamp(start + chapter.duration)}</span><h3 className="text-base">{chapter.title}</h3></div><Link href={chapter.path} target="_blank" rel="noreferrer" className="text-xs text-series-1">Open demo page ↗</Link></div>
          <p className="text-sm leading-6 text-text-secondary">{chapter.action}</p>
          <details className="mt-4 border-t border-border pt-4"><summary className="cursor-pointer text-xs text-series-1">Talking points</summary><p className="text-sm leading-7 text-text-secondary mt-3 max-w-4xl">{chapter.narration}</p></details>
        </article>;
      })}</div>
    </section>
    <p className="hint mt-6">If a live service fails, show its outcome and receipt, then use the dated published report to explain the earlier measurement. Keep the distinction clear. Never describe a simulation as an unexpected real-world failure.</p>
  </div>;
}
