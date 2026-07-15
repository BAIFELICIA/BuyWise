import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Home, ShoppingBag, Target, ReceiptText, Heart, Settings, Plus, ChevronRight,
  WalletCards, Clock3, TrendingUp, CheckCircle2, AlertTriangle, XCircle,
  Trash2, ArrowLeft, Sparkles, Users, CalendarDays, ShieldCheck
} from 'lucide-react';
import './styles.css';

type Goal = { id:string; name:string; target:number; saved:number; contribution:number };
type Bill = { id:string; name:string; amount:number; due:string; recurring:boolean };
type Decision = { id:string; item:string; price:number; score:number; verdict:string; date:string; category:string; reason:string };
type Wish = { id:string; item:string; price:number; added:string; waitDays:number };
type State = {
  balance:number; nextPay:number; nextPayDate:string; emergency:number; emergencyTarget:number;
  hourlyRate:number; fortnightFun:number; partnerContribution:number; goals:Goal[]; bills:Bill[]; decisions:Decision[]; wishlist:Wish[];
};

const initial: State = {
  balance: 850, nextPay: 920, nextPayDate: new Date(Date.now()+7*86400000).toISOString().slice(0,10),
  emergency: 300, emergencyTarget: 1000, hourlyRate: 29.45, fortnightFun: 220, partnerContribution: 0,
  goals: [{id:'g1',name:'Singapore',target:5000,saved:400,contribution:500}],
  bills: [{id:'b1',name:'Phone',amount:140,due:new Date(Date.now()+5*86400000).toISOString().slice(0,10),recurring:true}],
  decisions: [], wishlist: []
};

const money = (n:number) => new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);
const daysBetween=(a:string,b:string)=>Math.ceil((new Date(b).getTime()-new Date(a).getTime())/86400000);
const uid=()=>Math.random().toString(36).slice(2,10);

function App(){
  const [data,setData]=useState<State>(()=>{try{return JSON.parse(localStorage.getItem('buywise-v2')||'')||initial}catch{return initial}});
  const [tab,setTab]=useState('home');
  const [screen,setScreen]=useState<'main'|'decision'|'result'>('main');
  const [result,setResult]=useState<any>(null);
  useEffect(()=>localStorage.setItem('buywise-v2',JSON.stringify(data)),[data]);
  useEffect(()=>{if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{})},[]);

  const dueBills=useMemo(()=>data.bills.filter(b=>daysBetween(new Date().toISOString().slice(0,10),b.due)>=0).reduce((s,b)=>s+b.amount,0),[data.bills]);
  const safeToSpend=Math.max(0,data.balance-dueBills-Math.max(0,data.emergencyTarget-data.emergency));

  const save=(patch:Partial<State>)=>setData(d=>({...d,...patch}));
  const remove=(key:'goals'|'bills'|'wishlist',id:string)=>setData(d=>({...d,[key]:d[key].filter((x:any)=>x.id!==id)}));

  if(screen==='decision') return <DecisionForm data={data} onBack={()=>setScreen('main')} onDone={(r:any)=>{
    const dec:Decision={id:uid(),item:r.item,price:r.price,score:r.score,verdict:r.verdict,date:new Date().toISOString(),category:r.category,reason:r.summary};
    setData(d=>({...d,decisions:[dec,...d.decisions]})); setResult(r); setScreen('result');
  }} onWishlist={(w:Wish)=>setData(d=>({...d,wishlist:[w,...d.wishlist]}))}/>;
  if(screen==='result') return <Result result={result} onBack={()=>{setScreen('main');setTab('home')}} onWishlist={()=>{
    setData(d=>({...d,wishlist:[{id:uid(),item:result.item,price:result.price,added:new Date().toISOString(),waitDays:result.coolingDays},...d.wishlist]}));
  }}/>;

  return <div className="app-shell">
    <header className="topbar"><div><span className="eyebrow">BUYWISE</span><h1>{tab==='home'?'Your money, with context.':labels[tab]}</h1></div><button className="avatar" onClick={()=>setTab('settings')}>EH</button></header>
    <main>
      {tab==='home' && <HomeView data={data} dueBills={dueBills} safeToSpend={safeToSpend} onAsk={()=>setScreen('decision')} setTab={setTab}/>} 
      {tab==='goals' && <Goals data={data} save={save} remove={remove}/>} 
      {tab==='bills' && <Bills data={data} save={save} remove={remove}/>} 
      {tab==='wishlist' && <Wishlist data={data} remove={remove} onAsk={(w)=>{setResult(null);setScreen('decision')}}/>}
      {tab==='history' && <History data={data}/>} 
      {tab==='settings' && <SettingsView data={data} save={save} reset={()=>{setData(initial);localStorage.removeItem('buywise-v2')}}/>}
    </main>
    <nav className="bottom-nav">
      <Nav id="home" icon={Home} label="Home" tab={tab} setTab={setTab}/>
      <Nav id="goals" icon={Target} label="Goals" tab={tab} setTab={setTab}/>
      <button className="ask-fab" onClick={()=>setScreen('decision')}><Plus size={28}/></button>
      <Nav id="bills" icon={ReceiptText} label="Bills" tab={tab} setTab={setTab}/>
      <Nav id="wishlist" icon={Heart} label="Saved" tab={tab} setTab={setTab}/>
    </nav>
  </div>
}
const labels:any={goals:'Savings goals',bills:'Bills & commitments',wishlist:'Saved for later',history:'Decision history',settings:'Your BuyWise setup'};
function Nav({id,icon:Icon,label,tab,setTab}:any){return <button className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={21}/><span>{label}</span></button>}

function HomeView({data,dueBills,safeToSpend,onAsk,setTab}:any){
 const avg=data.decisions.length?Math.round(data.decisions.reduce((s:any,d:any)=>s+d.score,0)/data.decisions.length):null;
 return <>
  <section className="hero-card"><div><span>Safe to spend right now</span><strong>{money(safeToSpend)}</strong><small>after upcoming bills and your emergency buffer</small></div><ShieldCheck size={32}/></section>
  <div className="metric-grid"><Card label="Current balance" value={money(data.balance)} icon={WalletCards}/><Card label="Bills ahead" value={money(dueBills)} icon={CalendarDays}/><Card label="Average score" value={avg?`${avg}/100`:'—'} icon={TrendingUp}/><Card label="Next pay" value={money(data.nextPay)} icon={Sparkles}/></div>
  <button className="primary ask" onClick={onAsk}><span><ShoppingBag/>Should I buy something?</span><ChevronRight/></button>
  <Section title="Goals" action="View all" onAction={()=>setTab('goals')}>
    {data.goals.slice(0,2).map((g:any)=><Progress key={g.id} name={g.name} current={g.saved} target={g.target}/>) }
    {!data.goals.length&&<Empty text="Add a goal to measure what purchases delay."/>}
  </Section>
  <Section title="Recent decisions" action="History" onAction={()=>setTab('history')}>
    {data.decisions.slice(0,3).map((d:any)=><div className="list-row" key={d.id}><div className={`score-mini ${tone(d.score)}`}>{d.score}</div><div className="grow"><b>{d.item}</b><small>{money(d.price)} · {new Date(d.date).toLocaleDateString('en-AU')}</small></div><span className={`pill ${tone(d.score)}`}>{d.verdict}</span></div>)}
    {!data.decisions.length&&<Empty text="Your first decision will appear here."/>}
  </Section>
 </>
}
function Card({label,value,icon:Icon}:any){return <div className="metric"><Icon size={20}/><span>{label}</span><b>{value}</b></div>}
function Section({title,action,onAction,children}:any){return <section className="section"><div className="section-head"><h2>{title}</h2>{action&&<button onClick={onAction}>{action}</button>}</div>{children}</section>}
function Progress({name,current,target}:any){const p=Math.min(100,Math.round(current/Math.max(1,target)*100));return <div className="progress-item"><div><b>{name}</b><span>{money(current)} of {money(target)}</span></div><div className="bar"><i style={{width:`${p}%`}}/></div><small>{p}% funded</small></div>}
function Empty({text}:any){return <div className="empty">{text}</div>}

function DecisionForm({data,onBack,onDone,onWishlist}:any){
 const [f,setF]=useState({item:'',price:'',category:'General',need:'want',frequency:'weekly',wantedDays:'0',similar:'no',sale:'no',replace:'no',shared:'no'});
 const set=(k:string,v:string)=>setF(x=>({...x,[k]:v}));
 function calculate(){
  const price=Number(f.price)||0; const bills=data.bills.filter((b:any)=>daysBetween(new Date().toISOString().slice(0,10),b.due)>=0).reduce((s:number,b:any)=>s+b.amount,0);
  const available=data.balance-bills; let score=50;
  const ratio=price/Math.max(1,available); score += ratio<=.1?25:ratio<=.25?15:ratio<=.5?0:-25;
  if(data.balance-price-bills>=data.emergencyTarget) score+=12; else score-=15;
  if(f.need==='need') score+=18; if(f.frequency==='daily')score+=10; if(f.frequency==='rarely')score-=10;
  if(Number(f.wantedDays)>=30)score+=10; else if(Number(f.wantedDays)<2)score-=12;
  if(f.similar==='yes')score-=15; if(f.replace==='yes')score+=10; if(f.sale==='yes')score+=4;
  if(f.shared==='yes'&&data.partnerContribution>0)score+=5;
  score=Math.max(0,Math.min(100,Math.round(score)));
  const verdict=score>=75?'BUY':score>=55?'PLAN':score>=35?'WAIT':'DON’T BUY';
  const coolingDays=price>=500?14:price>=200?7:price>=80?2:1;
  const goal=data.goals[0]; const delay=goal?Math.ceil(price/Math.max(1,goal.contribution)*14):0;
  const hours=price/Math.max(1,data.hourlyRate);
  const after=data.balance-price-bills;
  const positives:string[]=[]; const warnings:string[]=[];
  if(ratio<=.25) positives.push('It fits within a reasonable share of your available cash.'); else warnings.push('It uses a large share of the money available before payday.');
  if(after>=data.emergencyTarget) positives.push('Your emergency buffer remains protected.'); else warnings.push('Your emergency buffer would fall below its target.');
  if(Number(f.wantedDays)>=30) positives.push('You have wanted it long enough to reduce impulse risk.'); else warnings.push('This is still inside the impulse-buy window.');
  if(f.similar==='yes') warnings.push('You already own something that may serve the same purpose.');
  const summary=verdict==='BUY'?'The purchase looks sustainable based on the information entered.':verdict==='PLAN'?'Affordable, but better after a small amount of planning.':verdict==='WAIT'?'Waiting protects your short-term cash position and goals.':'This purchase currently conflicts with your financial safety settings.';
  onDone({...f,price,score,verdict,coolingDays,delay,hours,after,positives,warnings,summary});
 }
 return <div className="full-screen"><header className="screen-head"><button onClick={onBack}><ArrowLeft/></button><div><span className="eyebrow">NEW DECISION</span><h1>Should I buy it?</h1></div></header><main>
  <div className="form-card"><Field label="What do you want to buy?"><input value={f.item} onChange={e=>set('item',e.target.value)} placeholder="e.g. AirPods Pro"/></Field><div className="two"><Field label="Price"><input type="number" value={f.price} onChange={e=>set('price',e.target.value)} placeholder="$0"/></Field><Field label="Category"><select value={f.category} onChange={e=>set('category',e.target.value)}>{['General','Clothing','Technology','Travel','Beauty','Car','Food','Home','Entertainment'].map(x=><option>{x}</option>)}</select></Field></div>
  <Choice label="Is it a need or a want?" value={f.need} set={v=>set('need',v)} options={[['need','Need'],['want','Want']]}/>
  <Choice label="How often will you use it?" value={f.frequency} set={v=>set('frequency',v)} options={[['daily','Daily'],['weekly','Weekly'],['monthly','Monthly'],['rarely','Rarely']]}/>
  <Field label="How many days have you wanted it?"><input type="number" value={f.wantedDays} onChange={e=>set('wantedDays',e.target.value)}/></Field>
  <Choice label="Do you own something similar?" value={f.similar} set={v=>set('similar',v)} options={[['yes','Yes'],['no','No']]}/>
  <Choice label="Is it replacing something broken?" value={f.replace} set={v=>set('replace',v)} options={[['yes','Yes'],['no','No']]}/>
  <Choice label="Is it genuinely discounted?" value={f.sale} set={v=>set('sale',v)} options={[['yes','Yes'],['no','No']]}/>
  <Choice label="Is the cost shared?" value={f.shared} set={v=>set('shared',v)} options={[['yes','Yes'],['no','No']]}/>
  <button className="primary" disabled={!f.item||!Number(f.price)} onClick={calculate}>Get my Buy Score</button>
  <button className="secondary" disabled={!f.item||!Number(f.price)} onClick={()=>{onWishlist({id:uid(),item:f.item,price:Number(f.price),added:new Date().toISOString(),waitDays:Number(f.price)>=200?7:2});onBack()}}>Save without deciding</button>
  </div></main></div>
}
function Field({label,children}:any){return <label className="field"><span>{label}</span>{children}</label>}
function Choice({label,value,set,options}:any){return <div className="field"><span>{label}</span><div className="choices">{options.map(([v,l]:any)=><button className={value===v?'selected':''} onClick={()=>set(v)}>{l}</button>)}</div></div>}

function Result({result,onBack,onWishlist}:any){return <div className="full-screen"><header className="screen-head"><button onClick={onBack}><ArrowLeft/></button><div><span className="eyebrow">BUYWISE RESULT</span><h1>{result.item}</h1></div></header><main>
 <section className={`result-hero ${tone(result.score)}`}><span>BUY SCORE</span><strong>{result.score}</strong><b>{result.verdict}</b><p>{result.summary}</p></section>
 <div className="impact-grid"><Card label="After purchase & bills" value={money(result.after)} icon={WalletCards}/><Card label="Work time" value={`${result.hours.toFixed(1)} hrs`} icon={Clock3}/><Card label="Goal delay" value={`${result.delay} days`} icon={Target}/><Card label="Cooling-off" value={`${result.coolingDays} days`} icon={CalendarDays}/></div>
 <Section title="Why"><div className="reason-list">{result.positives.map((x:string)=><p><CheckCircle2/> {x}</p>)}{result.warnings.map((x:string)=><p><AlertTriangle/> {x}</p>)}</div></Section>
 <button className="primary" onClick={onBack}>Done</button>{result.verdict!=='BUY'&&<button className="secondary" onClick={onWishlist}>Save to cooling-off list</button>}
 </main></div>}
function tone(score:number){return score>=75?'good':score>=55?'okay':score>=35?'warn':'bad'}

function Goals({data,save,remove}:any){const [form,setForm]=useState({name:'',target:'',saved:'',contribution:''});const add=()=>{if(!form.name)return;save({goals:[...data.goals,{id:uid(),name:form.name,target:+form.target||0,saved:+form.saved||0,contribution:+form.contribution||0}]});setForm({name:'',target:'',saved:'',contribution:''})};return <><Section title="Your goals">{data.goals.map((g:any)=><div className="manage-card"><Progress {...g} current={g.saved}/><button className="icon-btn" onClick={()=>remove('goals',g.id)}><Trash2/></button></div>)}</Section><Section title="Add a goal"><div className="form-card compact"><Field label="Goal name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><div className="two"><Field label="Target"><input type="number" value={form.target} onChange={e=>setForm({...form,target:e.target.value})}/></Field><Field label="Saved"><input type="number" value={form.saved} onChange={e=>setForm({...form,saved:e.target.value})}/></Field></div><Field label="Usual fortnightly contribution"><input type="number" value={form.contribution} onChange={e=>setForm({...form,contribution:e.target.value})}/></Field><button className="primary" onClick={add}>Add goal</button></div></Section></>}
function Bills({data,save,remove}:any){const [f,setF]=useState({name:'',amount:'',due:new Date().toISOString().slice(0,10)});const add=()=>{if(!f.name)return;save({bills:[...data.bills,{id:uid(),name:f.name,amount:+f.amount||0,due:f.due,recurring:true}]});setF({name:'',amount:'',due:new Date().toISOString().slice(0,10)})};return <><Section title="Upcoming bills">{data.bills.map((b:any)=><div className="list-row"><div className="round-icon"><ReceiptText/></div><div className="grow"><b>{b.name}</b><small>Due {new Date(b.due+'T00:00').toLocaleDateString('en-AU')}</small></div><strong>{money(b.amount)}</strong><button className="icon-btn" onClick={()=>remove('bills',b.id)}><Trash2/></button></div>)}</Section><Section title="Add a bill"><div className="form-card compact"><Field label="Bill"><input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field><div className="two"><Field label="Amount"><input type="number" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/></Field><Field label="Due date"><input type="date" value={f.due} onChange={e=>setF({...f,due:e.target.value})}/></Field></div><button className="primary" onClick={add}>Add bill</button></div></Section></>}
function Wishlist({data,remove}:any){return <Section title="Cooling-off list">{data.wishlist.map((w:any)=>{const elapsed=Math.max(0,daysBetween(w.added,new Date().toISOString()));const left=Math.max(0,w.waitDays-elapsed);return <div className="list-row"><div className="round-icon"><Heart/></div><div className="grow"><b>{w.item}</b><small>{left?`${left} days left to wait`:'Cooling-off complete'}</small></div><strong>{money(w.price)}</strong><button className="icon-btn" onClick={()=>remove('wishlist',w.id)}><Trash2/></button></div>})}{!data.wishlist.length&&<Empty text="Items saved for later will appear here."/>}</Section>}
function History({data}:any){return <Section title="All decisions">{data.decisions.map((d:any)=><div className="list-row"><div className={`score-mini ${tone(d.score)}`}>{d.score}</div><div className="grow"><b>{d.item}</b><small>{d.category} · {new Date(d.date).toLocaleDateString('en-AU')}</small></div><strong>{money(d.price)}</strong></div>)}{!data.decisions.length&&<Empty text="No decisions yet."/>}</Section>}
function SettingsView({data,save,reset}:any){return <div className="form-card"><Field label="Current bank balance"><input type="number" value={data.balance} onChange={e=>save({balance:+e.target.value})}/></Field><div className="two"><Field label="Next pay"><input type="number" value={data.nextPay} onChange={e=>save({nextPay:+e.target.value})}/></Field><Field label="Next payday"><input type="date" value={data.nextPayDate} onChange={e=>save({nextPayDate:e.target.value})}/></Field></div><div className="two"><Field label="Emergency savings"><input type="number" value={data.emergency} onChange={e=>save({emergency:+e.target.value})}/></Field><Field label="Emergency target"><input type="number" value={data.emergencyTarget} onChange={e=>save({emergencyTarget:+e.target.value})}/></Field></div><div className="two"><Field label="Hourly pay rate"><input type="number" value={data.hourlyRate} onChange={e=>save({hourlyRate:+e.target.value})}/></Field><Field label="Partner contribution"><input type="number" value={data.partnerContribution} onChange={e=>save({partnerContribution:+e.target.value})}/></Field></div><p className="privacy"><Users/> Data stays on this device in V2. Shared account syncing is prepared as a future upgrade.</p><button className="danger-btn" onClick={reset}>Reset all BuyWise data</button></div>}

createRoot(document.getElementById('root')!).render(<App/>);
