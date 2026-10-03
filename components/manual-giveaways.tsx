'use client';
import {useEffect,useState} from 'react';
import {type ManualGiveaway,manualState} from '@/lib/manual-giveaway-schema';
export function ManualGiveaways({items,serverTime}:{items:ManualGiveaway[],serverTime:number}){
  const [now,setNow]=useState(serverTime);
  useEffect(()=>{const start=Date.now();const t=setInterval(()=>setNow(serverTime+Date.now()-start),1000);return()=>clearInterval(t)},[serverTime]);
  return <div className="stack">{items.map(g=><ManualCard key={g.id} g={g} now={now}/>)}</div>;
}
function ManualCard({g,now}:{g:ManualGiveaway,now:number}){
  const state=manualState(g,now),seconds=Math.max(0,Math.floor((Date.parse(state==='Upcoming'?g.startsAt:g.endsAt)-now)/1000));
  const [checked,setChecked]=useState<Record<number,boolean>>({});
  return <article className="panel stack" id={g.id}><span className="eyebrow">{g.firm} · {state}</span><h2>{g.title}</h2><h3>{g.winners} × {g.accountSize} · {g.accountType}</h3>
    {['Open','Upcoming'].includes(state)&&<div><p>{state==='Upcoming'?'Starts in':'Entries close in'}</p><div className="countdown">{[[Math.floor(seconds/86400),'days'],[Math.floor(seconds/3600)%24,'hours'],[Math.floor(seconds/60)%60,'minutes'],[seconds%60,'seconds']].map(([n,l])=><div key={l}><strong>{String(n).padStart(2,'0')}</strong><span>{l}</span></div>)}</div></div>}
    <p className="help">Opens {new Date(g.startsAt).toUTCString()} · Closes {new Date(g.endsAt).toUTCString()}</p>
    <h3>Entry tasks</h3>{g.tasks.map((task,i)=><div key={i} className="contact-actions"><label className="consent"><input type="checkbox" checked={!!checked[i]} onChange={e=>setChecked({...checked,[i]:e.target.checked})}/><span>{task.label}</span></label>{task.url&&<a className="text-link" href={task.url} target="_blank" rel="noopener noreferrer">Open task ↗</a>}</div>)}
    <p className="help">This checklist is a reminder only. It does not verify tasks or save an entry. Submit your details and requested proof in the entry form.</p>
    <details><summary>Eligibility and giveaway rules</summary><p style={{whiteSpace:'pre-wrap'}}>{g.rules}</p></details>
    {state==='Open'?<a className="button" href={`/giveaways/enter/${g.id}`} target="_blank" rel="noopener noreferrer">Open entry form ↗</a>:<p className="notice">{state==='Upcoming'?'Applications open on the start date.':state==='Paused'?'Applications are paused.':'Applications are closed.'}</p>}
  </article>;
}
