import { useState, useEffect, useCallback } from “react”;

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = “investoros_v1”;

const INIT_HOLDINGS = [
{ id:1, ticker:“NFLX”, name:“Netflix”,       shares:2.83,  avg:95.49,  price:91.90,  target:15, role:“Growth”,     monthly:10, ret:-9.37,  retPct:-3.47 },
{ id:2, ticker:“AAPL”, name:“Apple”,          shares:0.73,  avg:199.01, price:269.50, target:25, role:“Anchor”,     monthly:20, ret:0.15,   retPct:0.07  },
{ id:3, ticker:“QQQ”,  name:“Invesco QQQ”,    shares:0.36,  avg:659.78, price:659.41, target:30, role:“Core ETF”,   monthly:40, ret:-0.22,  retPct:-0.09 },
{ id:4, ticker:“AGIX”, name:“SingularityNET”, shares:3.98,  avg:37.58,  price:39.00,  target:10, role:“Speculative”,monthly:5,  ret:5.55,   retPct:3.69  },
{ id:5, ticker:“NVDA”, name:“Nvidia”,         shares:0.023, avg:210.00, price:212.61, target:15, role:“AI Chips”,   monthly:20, ret:0.06,   retPct:1.24  },
{ id:6, ticker:“MSFT”, name:“Microsoft”,      shares:0,     avg:0,      price:415.80, target:5,  role:“AI Anchor”,  monthly:5,  ret:0,      retPct:0     },
];

const MILESTONES = [
{ value:10000,  label:”$10K”,  icon:“🥉”, color:”#818cf8” },
{ value:25000,  label:”$25K”,  icon:“🥈”, color:”#60a5fa” },
{ value:50000,  label:”$50K”,  icon:“🥇”, color:”#f59e0b” },
{ value:75000,  label:”$75K”,  icon:“💎”, color:”#f97316” },
{ value:100000, label:”$100K”, icon:“👑”, color:”#22c55e” },
];

const ACHIEVEMENTS = [
{ id:“first_invest”,  icon:“🚀”, label:“First Blood”,       desc:“Log your first contribution”,        xp:100,  check:s=>s.totalContributions>=1 },
{ id:“streak3”,       icon:“🔥”, label:“On Fire”,           desc:“3-month investment streak”,          xp:200,  check:s=>s.streak>=3 },
{ id:“streak6”,       icon:“⚡”, label:“Unstoppable”,       desc:“6-month investment streak”,          xp:500,  check:s=>s.streak>=6 },
{ id:“streak12”,      icon:“💫”, label:“Iron Will”,         desc:“12-month streak — full year!”,       xp:1000, check:s=>s.streak>=12 },
{ id:“hit5k”,         icon:“📈”, label:“Five Grand”,        desc:“Portfolio crosses $5K”,              xp:300,  check:s=>s.portfolioValue>=5000 },
{ id:“hit10k”,        icon:“🥉”, label:“10K Club”,          desc:“Portfolio crosses $10K”,             xp:500,  check:s=>s.portfolioValue>=10000 },
{ id:“hit25k”,        icon:“🥈”, label:“Quarter Century”,   desc:“Portfolio crosses $25K”,             xp:1000, check:s=>s.portfolioValue>=25000 },
{ id:“hit50k”,        icon:“🥇”, label:“Halfway There”,     desc:“Portfolio crosses $50K”,             xp:2000, check:s=>s.portfolioValue>=50000 },
{ id:“hit100k”,       icon:“👑”, label:“Six Figure Legend”, desc:“Portfolio crosses $100K”,            xp:5000, check:s=>s.portfolioValue>=100000 },
{ id:“diversified”,   icon:“🌐”, label:“Diversified”,       desc:“Own 5+ positions”,                   xp:250,  check:s=>s.activePositions>=5 },
{ id:“big_month”,     icon:“💰”, label:“Big Spender”,       desc:“Invest $500+ in one month”,          xp:400,  check:s=>s.maxMonthContrib>=500 },
{ id:“grand_month”,   icon:“💎”, label:“Grand Month”,       desc:“Invest $1,000+ in one month”,        xp:750,  check:s=>s.maxMonthContrib>=1000 },
{ id:“positive_ret”,  icon:“🟢”, label:“In The Green”,      desc:“Overall portfolio in profit”,        xp:200,  check:s=>s.totalReturn>0 },
{ id:“saved_data”,    icon:“💾”, label:“Data Saver”,        desc:“Export your portfolio backup”,       xp:150,  check:s=>s.hasExported },
];

const LEVELS = [
{ level:1,  title:“Saver Rookie”,    xpReq:0,     color:”#475569” },
{ level:2,  title:“Budget Builder”,  xpReq:200,   color:”#6366f1” },
{ level:3,  title:“Market Watcher”,  xpReq:600,   color:”#3b82f6” },
{ level:4,  title:“Stock Scout”,     xpReq:1200,  color:”#0ea5e9” },
{ level:5,  title:“Portfolio Pilot”, xpReq:2000,  color:”#10b981” },
{ level:6,  title:“Wealth Builder”,  xpReq:3200,  color:”#f59e0b” },
{ level:7,  title:“Market Veteran”,  xpReq:5000,  color:”#f97316” },
{ level:8,  title:“Growth Titan”,    xpReq:8000,  color:”#ef4444” },
{ level:9,  title:“Alpha Investor”,  xpReq:12000, color:”#ec4899” },
{ level:10, title:“FIRE Legend”,     xpReq:20000, color:”#22c55e” },
];

const MONTHS = [“Jan”,“Feb”,“Mar”,“Apr”,“May”,“Jun”,“Jul”,“Aug”,“Sep”,“Oct”,“Nov”,“Dec”];
const COLORS = [”#f59e0b”,”#22c55e”,”#6366f1”,”#ec4899”,”#10b981”,”#3b82f6”];

// ── DEFAULT STATE ─────────────────────────────────────────────────────────────
const DEFAULT_STATE = {
holdings: INIT_HOLDINGS,
contribs: {},          // { “2026-3”: 1000, “2026-4”: 500, … }
monthly: 1000,
unlockedAch: [],
hasExported: false,
lastSaved: null,
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function loadState() {
try {
const raw = localStorage.getItem(STORAGE_KEY);
if (!raw) return DEFAULT_STATE;
const parsed = JSON.parse(raw);
return { …DEFAULT_STATE, …parsed };
} catch {
return DEFAULT_STATE;
}
}

function saveState(state) {
try {
localStorage.setItem(STORAGE_KEY, JSON.stringify({ …state, lastSaved: new Date().toISOString() }));
return true;
} catch {
return false;
}
}

function getLevelInfo(xp) {
let cur = LEVELS[0], nxt = LEVELS[1];
for (let i = 0; i < LEVELS.length; i++) {
if (xp >= LEVELS[i].xpReq) { cur = LEVELS[i]; nxt = LEVELS[i+1]||null; }
}
const pct = nxt ? ((xp - cur.xpReq) / (nxt.xpReq - cur.xpReq)) * 100 : 100;
return { cur, nxt, pct };
}

function monthsTo(start, monthly, target) {
const r = 0.10/12; let v = start;
for (let m = 1; m <= 600; m++) {
v = v*(1+r); if (m%12!==0) v += monthly;
if (v >= target) return m;
}
return null;
}

function projectCurve(start, monthly, months) {
const r = 0.10/12; let v = start;
const pts = [{ m:0, v:start }];
for (let m = 1; m <= months; m++) {
v = v*(1+r); if (m%12!==0) v += monthly;
if (m%6===0||m===months) pts.push({ m, v });
}
return pts;
}

function contribKey(year, month) { return `${year}-${month}`; }

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
useEffect(() => { const t = setTimeout(onDone, 2500); return ()=>clearTimeout(t); }, []);
return (
<div style={{ position:“fixed”, top:16, left:“50%”, transform:“translateX(-50%)”, zIndex:9999, background:“linear-gradient(135deg,#4f46e5,#7c3aed)”, borderRadius:14, padding:“12px 20px”, boxShadow:“0 8px 32px #6366f155”, animation:“popIn 0.3s ease”, fontFamily:”‘Syne’,sans-serif”, fontWeight:800, color:”#fff”, fontSize:13, whiteSpace:“nowrap”, maxWidth:“90vw”, textAlign:“center” }}>
{msg}
</div>
);
}

// ── CONFETTI ──────────────────────────────────────────────────────────────────
function Confetti() {
const cols = [”#6366f1”,”#22c55e”,”#f59e0b”,”#ec4899”,”#3b82f6”,”#f97316”];
return (
<div style={{ position:“fixed”, inset:0, pointerEvents:“none”, zIndex:9998 }}>
{Array.from({length:35}).map((_,i) => (
<div key={i} style={{ position:“absolute”, width:7, height:7, borderRadius:2, background:cols[i%cols.length], left:`${(i*73)%100}%`, animation:`confettiFall ${1.2+Math.random()*0.8}s ease forwards`, animationDelay:`${Math.random()*0.4}s` }}/>
))}
</div>
);
}

// ── MILESTONE CHART ───────────────────────────────────────────────────────────
function MilestoneChart({ totalValue, monthly }) {
const pts = projectCurve(totalValue, monthly, 120);
const maxV = Math.max(…pts.map(p=>p.v), 105000);
const W=520, H=170, PL=46, PR=28, PT=10, PB=30;
const cW=W-PL-PR, cH=H-PT-PB;
const toX = m => (m/120)*cW;
const toY = v => cH-(v/maxV)*cH;
const path = pts.map((p,i)=>`${i===0?"M":"L"}${toX(p.m).toFixed(1)},${toY(p.v).toFixed(1)}`).join(” “);
const area = path+` L${toX(pts[pts.length-1].m)},${cH} L0,${cH} Z`;
return (
<svg width=“100%” viewBox={`0 0 ${W} ${H}`} style={{ overflow:“visible”, display:“block” }}>
<defs>
<linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stopColor="#6366f1" stopOpacity="0.35"/>
<stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
</linearGradient>
</defs>
<g transform={`translate(${PL},${PT})`}>
{MILESTONES.map(m=>{ const y=toY(m.value); if(y<0||y>cH) return null;
return <g key={m.label}><line x1={0} y1={y} x2={cW} y2={y} stroke={m.color} strokeWidth="1" strokeDasharray="5,4" opacity="0.5"/><text x={cW+4} y={y+4} fontSize="8" fill={m.color} fontFamily="DM Mono,monospace">{m.label}</text></g>;
})}
<path d={area} fill="url(#ag)"/>
<path d={path} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round"/>
<circle cx={0} cy={toY(totalValue)} r="5" fill="#6366f1" stroke="#080c18" strokeWidth="2"/>
{MILESTONES.map(m=>{ const mo=monthsTo(totalValue,monthly,m.value); if(!mo||mo>120) return null;
return <circle key={m.label} cx={toX(mo)} cy={toY(m.value)} r="4" fill={m.color} stroke="#080c18" strokeWidth="2"/>;
})}
{[0,24,48,72,96,120].map(m=>(
<text key={m} x={toX(m)} y={cH+16} fontSize="7" fill="#334155" textAnchor="middle" fontFamily="DM Mono,monospace">{m===0?“Now”:`Yr${m/12}`}</text>
))}
{[0,25000,50000,75000,100000].map(v=>{ const y=toY(v); if(y<0||y>cH) return null;
return <text key={v} x={-6} y={y+3} fontSize="7" fill="#334155" textAnchor="end" fontFamily="DM Mono,monospace">${v/1000}K</text>;
})}
</g>
</svg>
);
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
const [tab, setTab] = useState(“home”);
const [state, setState] = useState(() => loadState());
const [toast, setToast] = useState(null);
const [confetti, setConfetti] = useState(false);
const [saveFlash, setSaveFlash] = useState(false);
const [showImport, setShowImport] = useState(false);
const [importText, setImportText] = useState(””);
const [editHolding, setEditHolding] = useState(null);

const { holdings, contribs, monthly, unlockedAch, hasExported } = state;
const curYear = new Date().getFullYear();
const curMonth = new Date().getMonth();

// ── COMPUTED ──
const totalValue = holdings.reduce((s,h)=>s+h.shares*h.price,0);
const totalRet = holdings.reduce((s,h)=>s+h.ret,0);
const activePositions = holdings.filter(h=>h.shares>0).length;

const allContribValues = Object.values(contribs).filter(v=>v>0);
const totalContributions = allContribValues.length;
const maxMonthContrib = Math.max(0,…allContribValues);
const ytd = MONTHS.slice(0,curMonth+1).reduce((*,__,i)=>*+(contribs[contribKey(curYear,i)]||0),0);

const streak = (() => {
let s=0;
for (let i=curMonth; i>=0; i–) {
if (i===11) continue;
if ((contribs[contribKey(curYear,i)]||0)>0) s++;
else break;
}
return s;
})();

const contribXP = allContribValues.reduce((s,v)=>s+Math.floor(v/10),0);
const achXP = unlockedAch.reduce((s,id)=>{ const a=ACHIEVEMENTS.find(a=>a.id===id); return s+(a?a.xp:0); },0);
const streakBonus = streak*50;
const totalXP = contribXP + achXP + streakBonus;
const { cur:lvl, nxt:nextLvl, pct:lvlPct } = getLevelInfo(totalXP);

const gameState = { totalContributions, streak, portfolioValue:totalValue, activePositions, maxMonthContrib, totalReturn:totalRet, hasExported };

// ── AUTO-SAVE whenever state changes ──
useEffect(() => {
const saved = saveState(state);
if (saved) { setSaveFlash(true); setTimeout(()=>setSaveFlash(false), 1200); }
}, [state]);

// ── CHECK ACHIEVEMENTS ──
useEffect(() => {
const newOnes = ACHIEVEMENTS.filter(a => !unlockedAch.includes(a.id) && a.check(gameState));
if (newOnes.length > 0) {
const ids = newOnes.map(a=>a.id);
const xpGain = newOnes.reduce((s,a)=>s+a.xp,0);
setState(p=>({ …p, unlockedAch:[…p.unlockedAch,…ids] }));
setToast(`${newOnes[0].icon} ${newOnes[0].label} unlocked! +${xpGain} XP`);
setConfetti(true);
setTimeout(()=>setConfetti(false), 2500);
}
}, [totalContributions, streak, totalValue, activePositions, maxMonthContrib, totalRet, hasExported]);

// ── ACTIONS ──
const logContrib = useCallback((year, month, val) => {
const v = parseFloat(val)||0;
setState(p => ({ …p, contribs:{ …p.contribs, [contribKey(year,month)]:v } }));
if (v>0) setToast(`💰 +${Math.floor(v/10)} XP — $${v} invested!`);
}, []);

const updateHolding = useCallback((id, updates) => {
setState(p => ({ …p, holdings:p.holdings.map(h=>h.id===id?{…h,…updates}:h) }));
}, []);

const exportData = () => {
const data = JSON.stringify({ …state, exportedAt:new Date().toISOString(), version:“1.0” }, null, 2);
const blob = new Blob([data], { type:“application/json” });
const url = URL.createObjectURL(blob);
const a = document.createElement(“a”); a.href=url; a.download=`investoros-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
URL.revokeObjectURL(url);
setState(p=>({…p, hasExported:true}));
setToast(“💾 Backup saved! +150 XP incoming”);
};

const importData = () => {
try {
const parsed = JSON.parse(importText);
if (parsed.holdings && parsed.contribs !== undefined) {
setState({ …DEFAULT_STATE, …parsed });
setShowImport(false); setImportText(””);
setToast(“✅ Data imported successfully!”);
} else { setToast(“❌ Invalid backup file format”); }
} catch { setToast(“❌ Could not parse file — check format”); }
};

const resetData = () => {
if (window.confirm(“Reset ALL data? This cannot be undone.”)) {
localStorage.removeItem(STORAGE_KEY);
setState(DEFAULT_STATE);
setToast(“🔄 Data reset to defaults”);
}
};

// ── UI HELPERS ──
const nextMilestone = MILESTONES.find(m=>totalValue<m.value);
const mPct = nextMilestone ? Math.min((totalValue/nextMilestone.value)*100,100) : 100;
const mMonths = nextMilestone ? monthsTo(totalValue,monthly,nextMilestone.value) : null;
const calced = holdings.map(h=>({ …h, value:h.shares*h.price, pct:totalValue>0?(h.shares*h.price/totalValue)*100:0 }));

const TABS = [
{id:“home”,icon:“⚡”,label:“Home”},
{id:“quest”,icon:“🎯”,label:“Quests”},
{id:“port”,icon:“📊”,label:“Portfolio”},
{id:“milestones”,icon:“🏆”,label:“Goals”},
{id:“monthly”,icon:“📅”,label:“Log”},
];

return (
<div style={{ minHeight:“100vh”, background:”#06080f”, fontFamily:”‘DM Mono’,‘Courier New’,monospace”, color:”#e2e8f0”, paddingBottom:72 }}>
<style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#06080f}::-webkit-scrollbar-thumb{background:#1a2234;border-radius:2px} .card{background:#0c1020;border:1px solid #141d30;border-radius:14px} .gcard{background:linear-gradient(135deg,#0f1428,#0c1020);border:1px solid #1e2d50;border-radius:14px} input,textarea{background:#141d30;border:1px solid #1e2d50;border-radius:8px;color:#e2e8f0;font-family:inherit;font-size:13px;padding:6px 10px;outline:none;width:100%} input:focus,textarea:focus{border-color:#6366f1;box-shadow:0 0 0 2px #6366f118} .btn{background:#6366f1;border:none;border-radius:9px;color:white;cursor:pointer;font-family:inherit;font-size:12px;padding:8px 16px;font-weight:600;transition:all 0.2s} .btn:hover{background:#4f46e5;transform:translateY(-1px)} .btn-sm{padding:5px 12px;font-size:11px} .btn-danger{background:#7f1d1d;color:#fca5a5} .btn-danger:hover{background:#991b1b} .ghost{background:none;border:1px solid #1e2d50;border-radius:8px;color:#64748b;cursor:pointer;font-family:inherit;font-size:11px;padding:5px 10px;transition:all 0.2s} .ghost:hover{border-color:#6366f1;color:#818cf8} .navbtn{background:none;border:none;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 10px;border-radius:10px;transition:all 0.15s;flex:1} .navbtn:hover{background:#0f1623} .quick-amt{flex:1;padding:7px 0;background:#141d30;border:1px solid #1e2d50;border-radius:8px;color:#64748b;font-size:11px;cursor:pointer;font-family:inherit;transition:all 0.15s} .quick-amt:hover{background:#1e2d50;color:#e2e8f0;border-color:#6366f1} @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} .up{animation:up 0.3s ease forwards} @keyframes popIn{from{opacity:0;transform:scale(0.85) translateY(-8px)}to{opacity:1;transform:scale(1) translateY(0)}} @keyframes confettiFall{from{top:-20px;opacity:1;transform:rotate(0deg)}to{top:110vh;opacity:0;transform:rotate(720deg)}} @keyframes glow{0%,100%{box-shadow:0 0 12px #6366f130}50%{box-shadow:0 0 24px #6366f160}} @keyframes savePulse{0%{opacity:0;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}100%{opacity:0}} .save-indicator{animation:savePulse 1.2s ease forwards} .modal-bg{position:fixed;inset:0;background:#00000088;z-index:500;display:flex;align-items:center;justify-content:center;padding:20px} .modal{background:#0c1020;border:1px solid #1e2d50;border-radius:18px;padding:20px;width:100%;max-width:400px}`}</style>

```
  {toast && <Toast msg={toast} onDone={()=>setToast(null)}/>}
  {confetti && <Confetti/>}

  {/* Save indicator */}
  {saveFlash && (
    <div className="save-indicator" style={{ position:"fixed", top:10, right:12, fontSize:9, color:"#22c55e", zIndex:9997, letterSpacing:"0.5px" }}>
      💾 saved
    </div>
  )}

  {/* Import modal */}
  {showImport && (
    <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)setShowImport(false)}}>
      <div className="modal">
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:16, color:"#fff", marginBottom:12 }}>📂 Import Backup</div>
        <div style={{ fontSize:10, color:"#475569", marginBottom:10 }}>Paste the contents of your backup JSON file below.</div>
        <textarea value={importText} onChange={e=>setImportText(e.target.value)} rows={8} placeholder='{"holdings":[...],"contribs":{...},...}' style={{ marginBottom:12, fontSize:10, resize:"vertical" }}/>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-sm" style={{ flex:1 }} onClick={importData}>Import</button>
          <button className="ghost" style={{ flex:1 }} onClick={()=>{setShowImport(false);setImportText("");}}>Cancel</button>
        </div>
      </div>
    </div>
  )}

  {/* Edit holding modal */}
  {editHolding && (
    <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)setEditHolding(null)}}>
      <div className="modal">
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:16, color:"#fff", marginBottom:4 }}>Edit {editHolding.ticker}</div>
        <div style={{ fontSize:9, color:"#334155", marginBottom:16 }}>Update your current shares and average cost</div>
        {[
          { label:"Shares owned", field:"shares", type:"number", placeholder:"e.g. 0.36" },
          { label:"Average cost per share ($)", field:"avg", type:"number", placeholder:"e.g. 659.78" },
          { label:"Current price ($)", field:"price", type:"number", placeholder:"e.g. 659.41" },
          { label:"Total return ($)", field:"ret", type:"number", placeholder:"e.g. -0.22" },
        ].map(f => (
          <div key={f.field} style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:"#475569", marginBottom:4 }}>{f.label}</div>
            <input type={f.type} value={editHolding[f.field]||""} placeholder={f.placeholder}
              onChange={e=>setEditHolding(p=>({...p,[f.field]:e.target.value}))}/>
          </div>
        ))}
        <div style={{ display:"flex", gap:8, marginTop:4 }}>
          <button className="btn btn-sm" style={{ flex:1 }} onClick={()=>{
            updateHolding(editHolding.id, {
              shares:parseFloat(editHolding.shares)||0,
              avg:parseFloat(editHolding.avg)||0,
              price:parseFloat(editHolding.price)||0,
              ret:parseFloat(editHolding.ret)||0,
              retPct:editHolding.avg>0?((parseFloat(editHolding.ret)||0)/(parseFloat(editHolding.avg)*parseFloat(editHolding.shares)||1)*100):0,
            });
            setEditHolding(null);
            setToast(`✅ ${editHolding.ticker} updated & saved!`);
          }}>Save Changes</button>
          <button className="ghost" style={{ flex:1 }} onClick={()=>setEditHolding(null)}>Cancel</button>
        </div>
      </div>
    </div>
  )}

  {/* ══ HOME ══ */}
  {tab==="home" && (
    <div className="up" style={{ padding:"16px 14px" }}>
      {/* Hero */}
      <div style={{ background:"linear-gradient(135deg,#0f1635 0%,#1a0f35 60%,#0f1635 100%)", border:"1px solid #2d2b6e", borderRadius:18, padding:18, marginBottom:12, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, background:"radial-gradient(circle,#6366f128,transparent)", borderRadius:"50%", pointerEvents:"none" }}/>
        <div style={{ fontSize:8, color:"#6366f1", letterSpacing:"1.5px", marginBottom:4 }}>INVESTOR LEVEL · {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:900, color:"#fff" }}>{lvl.title}</div>
            <div style={{ fontSize:9, color:"#6366f1", marginTop:1 }}>Level {lvl.level} · {totalXP.toLocaleString()} XP</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:900, color:"#fff" }}>${totalValue.toFixed(0)}</div>
            <div style={{ fontSize:10, color:totalRet>=0?"#22c55e":"#ef4444" }}>{totalRet>=0?"+":""}${totalRet.toFixed(2)}</div>
          </div>
        </div>
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, fontSize:8, color:"#334155" }}>
            <span>{nextLvl?`→ ${nextLvl.title}`:"MAX LEVEL 🎉"}</span>
            <span>{nextLvl?`${(nextLvl.xpReq-totalXP).toLocaleString()} XP to go`:""}</span>
          </div>
          <div style={{ height:8, background:"#1a2234", borderRadius:4, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:4, background:`linear-gradient(90deg,${lvl.color},${lvl.color}bb)`, width:`${lvlPct}%`, transition:"width 1s ease", boxShadow:`0 0 8px ${lvl.color}55` }}/>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
          {[
            {l:"🔥 Streak", v:`${streak}mo`},
            {l:"🏆 Badges", v:`${unlockedAch.length}/${ACHIEVEMENTS.length}`},
            {l:"📈 YTD", v:`$${ytd.toLocaleString()}`},
          ].map(s=>(
            <div key={s.l} style={{ background:"#06080f", borderRadius:9, padding:"7px 8px", textAlign:"center" }}>
              <div style={{ fontSize:8, color:"#334155", marginBottom:2 }}>{s.l}</div>
              <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Next milestone */}
      {nextMilestone && (
        <div className="gcard" style={{ padding:14, marginBottom:12, animation:"glow 3s infinite" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div>
              <div style={{ fontSize:8, color:"#334155", letterSpacing:"1px", marginBottom:2 }}>NEXT MILESTONE</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:900, color:nextMilestone.color }}>{nextMilestone.icon} {nextMilestone.label}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10, color:"#475569" }}>~{mMonths?(mMonths/12).toFixed(1):"?"} yrs away</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:"#fff" }}>{mPct.toFixed(1)}%</div>
            </div>
          </div>
          <div style={{ height:9, background:"#141d30", borderRadius:5, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:5, background:`linear-gradient(90deg,${nextMilestone.color},${nextMilestone.color}88)`, width:`${mPct}%`, transition:"width 1s ease", boxShadow:`0 0 10px ${nextMilestone.color}55` }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:8, color:"#1e2d50" }}>
            <span>${totalValue.toFixed(0)}</span><span>${nextMilestone.value.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Quick log */}
      <div className="card" style={{ padding:14, marginBottom:12 }}>
        <div style={{ fontSize:8, color:"#6366f1", letterSpacing:"1px", marginBottom:8 }}>⚡ LOG INVESTMENT — {MONTHS[curMonth]} {curYear}</div>
        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
          <input type="number" placeholder={`Amount invested ($${monthly} target)...`} id="qlog" style={{ flex:1 }}
            onKeyDown={e=>{ if(e.key==="Enter"){ const v=parseFloat(e.target.value); if(v>0){logContrib(curYear,curMonth,v);e.target.value="";}}}}/>
          <button className="btn btn-sm" onClick={()=>{ const el=document.getElementById("qlog"); const v=parseFloat(el.value); if(v>0){logContrib(curYear,curMonth,v);el.value="";}}}>Log</button>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[250,500,750,1000].map(amt=>(
            <button key={amt} className="quick-amt" onClick={()=>logContrib(curYear,curMonth,amt)}>${amt}</button>
          ))}
        </div>
        {(contribs[contribKey(curYear,curMonth)]||0)>0 && (
          <div style={{ marginTop:8, padding:"6px 10px", background:"#081a0e", borderRadius:8, border:"1px solid #14532d", fontSize:10, color:"#86efac", textAlign:"center" }}>
            ✅ {MONTHS[curMonth]} logged: ${(contribs[contribKey(curYear,curMonth)]||0).toLocaleString()} · +{Math.floor((contribs[contribKey(curYear,curMonth)]||0)/10)} XP
          </div>
        )}
      </div>

      {/* Recent achievements */}
      <div className="card" style={{ padding:14, marginBottom:12 }}>
        <div style={{ fontSize:8, color:"#334155", letterSpacing:"1px", marginBottom:10 }}>RECENT ACHIEVEMENTS</div>
        {unlockedAch.length===0 ? (
          <div style={{ fontSize:11, color:"#1e2d50", textAlign:"center", padding:"10px 0" }}>Log your first investment to start earning! 🚀</div>
        ) : unlockedAch.slice(-3).reverse().map(id=>{
          const a=ACHIEVEMENTS.find(a=>a.id===id); if(!a) return null;
          return (
            <div key={id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", background:"#0a1422", borderRadius:9, border:"1px solid #1e2d50", marginBottom:6 }}>
              <span style={{ fontSize:18 }}>{a.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:"#e2e8f0", fontWeight:500 }}>{a.label}</div>
                <div style={{ fontSize:9, color:"#334155" }}>{a.desc}</div>
              </div>
              <div style={{ fontSize:10, color:"#6366f1", fontWeight:600 }}>+{a.xp}XP</div>
            </div>
          );
        })}
      </div>

      {/* Data controls */}
      <div className="card" style={{ padding:14 }}>
        <div style={{ fontSize:8, color:"#334155", letterSpacing:"1px", marginBottom:10 }}>💾 DATA & BACKUP</div>
        <div style={{ fontSize:10, color:"#475569", marginBottom:10, lineHeight:1.6 }}>
          Your data auto-saves to this device after every change. Export a backup file to protect against clearing your browser/app data.
        </div>
        {state.lastSaved && (
          <div style={{ fontSize:9, color:"#22c55e", marginBottom:10 }}>✓ Last saved: {new Date(state.lastSaved).toLocaleString()}</div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
          <button className="btn btn-sm" onClick={exportData}>📤 Export Backup</button>
          <button className="ghost" onClick={()=>setShowImport(true)}>📂 Import Backup</button>
        </div>
        <button className="ghost btn-danger" style={{ width:"100%", fontSize:10 }} onClick={resetData}>🔄 Reset All Data</button>
      </div>
    </div>
  )}

  {/* ══ QUESTS ══ */}
  {tab==="quest" && (
    <div className="up" style={{ padding:"16px 14px" }}>
      <div style={{ background:"linear-gradient(135deg,#0f1635,#1a0f35)", border:"1px solid #2d2b6e", borderRadius:14, padding:14, marginBottom:12 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, textAlign:"center" }}>
          {[{l:"Total XP",v:totalXP.toLocaleString(),c:"#818cf8"},{l:"From Investing",v:contribXP.toLocaleString(),c:"#22c55e"},{l:"Streak Bonus",v:`+${streakBonus}`,c:"#f59e0b"}].map(s=>(
            <div key={s.l}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:900, color:s.c }}>{s.v}</div>
              <div style={{ fontSize:8, color:"#334155", marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Streak */}
      <div className="card" style={{ padding:14, marginBottom:12 }}>
        <div style={{ fontSize:8, color:"#f59e0b", letterSpacing:"1px", marginBottom:8 }}>🔥 MONTHLY STREAK — {curYear}</div>
        <div style={{ display:"flex", gap:4, marginBottom:8 }}>
          {MONTHS.slice(0,curMonth+1).map((m,i)=>{
            const has=(contribs[contribKey(curYear,i)]||0)>0;
            const isDec=i===11;
            return (
              <div key={m} style={{ flex:1, textAlign:"center" }}>
                <div style={{ height:26, borderRadius:6, background:isDec?"#1a2234":has?"#f59e0b22":"#141d30", border:`1px solid ${isDec?"#1e2d50":has?"#f59e0b66":"#1e2d50"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>
                  {isDec?"⛷":has?"🔥":""}
                </div>
                <div style={{ fontSize:7, color:"#1e2d50", marginTop:2 }}>{m.slice(0,1)}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize:11, color:streak>0?"#f59e0b":"#334155", textAlign:"center" }}>
          {streak>0?`🔥 ${streak}-month streak! +${streakBonus} bonus XP`:"Log this month to start your streak!"}
        </div>
      </div>

      <div style={{ fontSize:8, color:"#334155", letterSpacing:"1px", marginBottom:8 }}>ALL ACHIEVEMENTS ({unlockedAch.length}/{ACHIEVEMENTS.length})</div>
      <div style={{ display:"grid", gap:6 }}>
        {ACHIEVEMENTS.map(a=>{
          const done=unlockedAch.includes(a.id);
          return (
            <div key={a.id} style={{ padding:"11px 14px", borderRadius:11, display:"flex", alignItems:"center", gap:10, background:done?"#0a1422":"#0c1020", border:`1px solid ${done?"#1e3a5f":"#141d30"}`, opacity:done?1:0.45 }}>
              <div style={{ fontSize:20, filter:done?"none":"grayscale(1)", minWidth:28 }}>{a.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:done?"#e2e8f0":"#475569", fontWeight:done?600:400 }}>{a.label}</div>
                <div style={{ fontSize:8, color:"#334155", marginTop:1 }}>{a.desc}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, color:done?"#6366f1":"#1e2d50", fontWeight:600 }}>+{a.xp}XP</div>
                {done&&<div style={{ fontSize:8, color:"#22c55e" }}>✓</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )}

  {/* ══ PORTFOLIO ══ */}
  {tab==="port" && (
    <div className="up" style={{ padding:"16px 14px" }}>
      <div className="card" style={{ padding:14, marginBottom:12 }}>
        <div style={{ fontSize:8, color:"#334155", letterSpacing:"1px", marginBottom:8 }}>ALLOCATION</div>
        <div style={{ display:"flex", height:20, borderRadius:6, overflow:"hidden", gap:2, marginBottom:7 }}>
          {calced.filter(h=>h.pct>0).map((h,i)=>(
            <div key={h.id} title={`${h.ticker}: ${h.pct.toFixed(1)}%`} style={{ width:`${h.pct}%`, background:COLORS[i%COLORS.length], display:"flex", alignItems:"center", justifyContent:"center", fontSize:7, color:"white", overflow:"hidden", fontWeight:700 }}>
              {h.pct>10?h.ticker:""}
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {calced.filter(h=>h.pct>0).map((h,i)=>(
            <div key={h.id} style={{ display:"flex", alignItems:"center", gap:3, fontSize:8, color:"#64748b" }}>
              <div style={{ width:6, height:6, borderRadius:2, background:COLORS[i%COLORS.length] }}/>{h.ticker} {h.pct.toFixed(1)}%
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow:"hidden", marginBottom:12 }}>
        {calced.map((h,i)=>(
          <div key={h.id} style={{ padding:"12px 14px", borderBottom:i<holdings.length-1?"1px solid #0a1020":"none" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:14, color:"#fff" }}>{h.ticker}</span>
                  <span style={{ fontSize:8, color:"#334155" }}>{h.name}</span>
                </div>
                <div style={{ fontSize:8, color:h.role.includes("Core")?"#818cf8":h.role.includes("AI")?"#34d399":"#334155", marginTop:2 }}>{h.role}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#fff" }}>{h.value>0?`$${h.value.toFixed(2)}`:"—"}</div>
                <div style={{ fontSize:9, color:h.ret>0?"#22c55e":h.ret<0?"#ef4444":"#475569" }}>
                  {h.ret!==0?`${h.ret>0?"+":""}$${h.ret.toFixed(2)} (${h.retPct.toFixed(1)}%)`:"Not started"}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ flex:1, marginRight:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2, fontSize:7, color:"#334155" }}>
                  <span>{h.pct.toFixed(1)}%</span><span>Target: {h.target}%</span>
                </div>
                <div style={{ height:4, background:"#141d30", borderRadius:2 }}>
                  <div style={{ height:"100%", borderRadius:2, background:h.pct>=h.target?"#22c55e":"#6366f1", width:`${Math.min((h.pct/h.target||0)*100,100)}%`, transition:"width 0.6s" }}/>
                </div>
              </div>
              <button className="ghost" style={{ fontSize:9, padding:"3px 8px", whiteSpace:"nowrap" }} onClick={()=>setEditHolding({...h})}>✏️ Edit</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, textAlign:"center" }}>
          {[{l:"Total Value",v:`$${totalValue.toFixed(0)}`},{l:"Total Return",v:`${totalRet>=0?"+":""}$${totalRet.toFixed(2)}`,c:totalRet>=0?"#22c55e":"#ef4444"},{l:"Positions",v:activePositions}].map(s=>(
            <div key={s.l}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:900, color:s.c||"#fff" }}>{s.v}</div>
              <div style={{ fontSize:8, color:"#334155", marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )}

  {/* ══ MILESTONES ══ */}
  {tab==="milestones" && (
    <div className="up" style={{ padding:"16px 14px" }}>
      <div className="card" style={{ padding:14, marginBottom:12 }}>
        <div style={{ fontSize:8, color:"#334155", letterSpacing:"1px", marginBottom:6 }}>MONTHLY INVESTMENT</div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
          <span style={{ color:"#6366f1", fontSize:18 }}>$</span>
          <input type="number" value={monthly} onChange={e=>setState(p=>({...p,monthly:parseFloat(e.target.value)||0}))}
            style={{ fontSize:20, fontFamily:"'Syne',sans-serif", fontWeight:900, background:"none", border:"none", color:"#fff", padding:0, width:90 }}/>
          <span style={{ fontSize:9, color:"#334155" }}>/mo · skip Dec</span>
        </div>
        <MilestoneChart totalValue={totalValue} monthly={monthly}/>
      </div>

      <div style={{ display:"grid", gap:8 }}>
        {MILESTONES.map(m=>{
          const reached=totalValue>=m.value;
          const pct=Math.min((totalValue/m.value)*100,100);
          const mo=monthsTo(totalValue,monthly,m.value);
          return (
            <div key={m.label} style={{ padding:"14px 14px", borderRadius:12, background:reached?"#081a0e":"#0c1020", border:`1px solid ${reached?m.color+"44":"#141d30"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:22 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:15, color:reached?m.color:"#fff" }}>{m.label}</div>
                    <div style={{ fontSize:8, color:"#334155" }}>{reached?"🎉 Achieved!":mo?`~${(mo/12).toFixed(1)} yrs · ${mo} mo`:"Beyond 10yr"}</div>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:900, color:m.color }}>{pct.toFixed(1)}%</div>
                  <div style={{ fontSize:8, color:"#334155" }}>${totalValue.toFixed(0)} / ${m.value.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ height:7, background:"#141d30", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:4, background:reached?m.color:`linear-gradient(90deg,${m.color}88,${m.color}44)`, width:`${pct}%`, transition:"width 1s ease", boxShadow:reached?`0 0 8px ${m.color}55`:"none" }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )}

  {/* ══ MONTHLY LOG ══ */}
  {tab==="monthly" && (
    <div className="up" style={{ padding:"16px 14px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
        <div className="card" style={{ padding:14 }}>
          <div style={{ fontSize:8, color:"#334155", letterSpacing:"1px", marginBottom:6 }}>MONTHLY TARGET</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ color:"#6366f1" }}>$</span>
            <input type="number" value={monthly} onChange={e=>setState(p=>({...p,monthly:parseFloat(e.target.value)||0}))}
              style={{ fontSize:18, fontFamily:"'Syne',sans-serif", fontWeight:900, background:"none", border:"none", color:"#fff", padding:0, width:80 }}/>
          </div>
        </div>
        <div className="card" style={{ padding:14 }}>
          <div style={{ fontSize:8, color:"#334155", letterSpacing:"1px", marginBottom:4 }}>YTD INVESTED</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:900, color:"#22c55e" }}>${ytd.toLocaleString()}</div>
          <div style={{ fontSize:8, color:"#334155", marginTop:2 }}>{totalContributions} months logged</div>
        </div>
      </div>

      {/* Buy splits */}
      <div className="card" style={{ overflow:"hidden", marginBottom:12 }}>
        <div style={{ padding:"10px 14px", borderBottom:"1px solid #0a1020", fontSize:8, color:"#6366f1", letterSpacing:"1px" }}>THIS MONTH'S BUY LIST</div>
        {holdings.filter(h=>h.monthly>0).map((h,i,arr)=>{
          const amt=((h.monthly/100)*monthly).toFixed(2);
          const qty=(((h.monthly/100)*monthly)/h.price).toFixed(4);
          return (
            <div key={h.id} style={{ padding:"10px 14px", borderBottom:i<arr.length-1?"1px solid #0a1020":"none", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:13, color:"#fff" }}>{h.ticker}</span>
                <span style={{ fontSize:8, color:"#334155", marginLeft:8 }}>{h.monthly}% · {h.name}</span>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#6366f1" }}>${amt}</div>
                <div style={{ fontSize:8, color:"#334155" }}>≈{qty} shares</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contribution log */}
      <div className="card" style={{ overflow:"hidden" }}>
        <div style={{ padding:"10px 14px", borderBottom:"1px solid #0a1020", display:"flex", justifyContent:"space-between" }}>
          <div style={{ fontSize:8, color:"#334155", letterSpacing:"1px" }}>LOG — {curYear}</div>
          <div style={{ fontSize:9, color:"#22c55e" }}>YTD: ${ytd.toLocaleString()}</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:1, background:"#0a1020" }}>
          {MONTHS.map((m,i)=>{
            const key=contribKey(curYear,i);
            const c=contribs[key]||0;
            const past=i<=curMonth;
            const isDec=i===11;
            return (
              <div key={m} style={{ background:"#0c1020", padding:9, textAlign:"center" }}>
                <div style={{ fontSize:7, color:i===curMonth?"#6366f1":isDec?"#1e2d50":"#1e2d50", marginBottom:4, letterSpacing:"0.5px" }}>{m}{isDec?" ⛷":""}</div>
                {past?(
                  <>
                    <input type="number" value={c||""} onChange={e=>logContrib(curYear,i,e.target.value)} placeholder="$0" style={{ textAlign:"center", fontSize:11, padding:"4px 4px" }}/>
                    {c>0&&<div style={{ fontSize:7, color:"#22c55e", marginTop:2 }}>🔥+{Math.floor(c/10)}xp</div>}
                  </>
                ):(
                  <div style={{ fontSize:10, color:"#141d30" }}>—</div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding:"8px 14px", borderTop:"1px solid #0a1020", fontSize:8, color:"#334155", textAlign:"center" }}>
          Every $10 invested = 1 XP · Auto-saves after every entry 💾
        </div>
      </div>
    </div>
  )}

  {/* ── BOTTOM NAV ── */}
  <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#080c14", borderTop:"1px solid #141d30", padding:"6px 8px", display:"flex", zIndex:100 }}>
    {TABS.map(t=>(
      <button key={t.id} className="navbtn" onClick={()=>setTab(t.id)} style={{ color:tab===t.id?"#6366f1":"#334155" }}>
        <span style={{ fontSize:17 }}>{t.icon}</span>
        <span style={{ fontSize:8 }}>{t.label}</span>
        {tab===t.id&&<div style={{ width:4, height:4, borderRadius:"50%", background:"#6366f1" }}/>}
      </button>
    ))}
  </div>
</div>
```

);
}
