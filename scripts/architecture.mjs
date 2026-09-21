import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('public/submission', { recursive: true });
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const text = (x,y,s,size=18,color='#b4c4cf',weight=400) => '<text x="'+x+'" y="'+y+'" font-family="Arial, sans-serif" font-size="'+size+'" fill="'+color+'" font-weight="'+weight+'">'+esc(s)+'</text>';
const box = (x,y,w,h,label,lines,color='#7de3c2') => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="14" fill="#111d27" stroke="#30414d"/>'+text(x+22,y+34,label,19,color,600)+lines.map((l,i)=>text(x+22,y+64+i*25,l,15)).join('');
const arrow = (x1,y1,x2,y2,color='#7de3c2') => '<path d="M'+x1+' '+y1+' H'+x2+' V'+y2+'" fill="none" stroke="'+color+'" stroke-width="2" marker-end="url(#arrow)"/>';
let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1050" viewBox="0 0 1440 1050"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="#7de3c2"/></marker></defs><rect width="1440" height="1050" fill="#080e14"/>';
svg += text(60,70,'AEGIS / SYSTEM ARCHITECTURE',16,'#7de3c2',600)+text(60,122,'Evidence before trust.',42,'#eef5f8',600)+text(60,159,'Track 04 · Agent Reliability, Security & Evaluation · SyedMaaz786',18);
svg += '<rect x="45" y="200" width="1350" height="370" rx="18" fill="#0b141c" stroke="#263945" stroke-dasharray="7 5"/>'+text(66,232,'NEXT.JS NODE RUNTIME / REQUEST RELEASE BOUNDARY',13,'#8395a4',600);
const nodes=[
[65,'01  Input guardrail',['Unicode normalization','Sensitive-data patterns','Moss threat retrieval']],
[330,'02  Policy retrieval',['Bundled MiniLM vectors','Moss native session','Top policy candidates']],
[595,'03  Source integrity',['Versioned policy corpus','SHA-256 source match','Quarantine altered text']],
[860,'04  Candidate answer',['Groq generation','Trusted policy context','Never streamed to user']],
[1125,'05  Release gate',['PII scan + numeric check','Moss source re-retrieval','Withhold failed output']],
];
for (const [i,[x,title,lines]] of nodes.entries()) {
 svg += box(x,265,245,160,title,lines);
 if (i<4) svg += arrow(x+245,345,x+263,345);
}
svg += text(80,475,'BLOCK / DECLINE',14,'#ff9595',600)+text(80,505,'Any failed gate stops release. Outage is recorded as unavailable, never a successful answer.',18);
svg += text(80,543,'No financial tools. No account changes. No raw rejected candidate in traces.',15,'#8395a4');
svg += box(65,620,410,190,'Moss retrieval layer',['Native custom sessions in-process','Same bundled encoder for docs + queries','No model download on live requests','Embedding and search timed separately']);
svg += box(515,620,410,190,'Evaluation + observability',['32 public regression cases','Attack blocking AND benign success','Live progress and per-case failures','JSON exports + browser run comparison'],'#a1b8ff');
svg += box(965,620,405,190,'Privacy + failure isolation',['Per-visitor HttpOnly session cookie','Redacted, temporary trace memory','Request-scoped outage simulations','Rate limits and bounded calls'],'#ecc681');
svg += arrow(442,425,442,607)+arrow(720,570,720,607)+arrow(1230,425,1230,607);
svg += '<rect x="65" y="855" width="1305" height="110" rx="14" fill="#10231e" stroke="#345b4c"/>'+text(87,893,'THE TRUST CONTRACT',14,'#7de3c2',600)+text(87,923,'A released answer needs trusted context and passing output checks. A safe refusal is still a usefulness failure.',18,'#d9e8e2');
svg += text(65,1005,'Similarity is a heuristic, not factual entailment. Single-tenant demonstration; memory is not durable storage.',15,'#8395a4')+'</svg>';
writeFileSync('public/submission/architecture.svg',svg);
