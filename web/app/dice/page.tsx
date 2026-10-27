"use client";
import Link from "next/link";
import { useState } from "react";
type Kind = "ability"|"attack"|"save"|"damage"|"healing";
type Mode = "normal"|"advantage"|"disadvantage";
type Receipt = {id:string;timestamp:string;kind:Kind;sides:number;dice:number[];kept:number;modifier:number;total:number;dc:number|null;success:boolean|null;mode:Mode;consequence:string};
export default function DiceLab(){
 const [kind,setKind]=useState<Kind>("ability");
 const [mode,setMode]=useState<Mode>("normal");
 const [modifier,setModifier]=useState(2);
 const [dc,setDc]=useState(15);
 const [sides,setSides]=useState(6);
 const [count,setCount]=useState(2);
 const [rolling,setRolling]=useState(false);
 const [receipt,setReceipt]=useState<Receipt|null>(null);
 const [error,setError]=useState("");
 const check=["ability","attack","save"].includes(kind);
 async function roll(){
  if(rolling)return;
  setRolling(true);setReceipt(null);setError("");
  try {
   const request={kind,modifier,...(check?{dc,mode}:{sides,count,mode:"normal"})};
   const [response]=await Promise.all([fetch("/api/dice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request)}),new Promise(resolve=>setTimeout(resolve,1100))]);
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"Roll failed");
   setReceipt(data as Receipt);
  }catch(e){setError(e instanceof Error?e.message:"Roll failed");}
  finally{setRolling(false);}
 }
 return <main className="shell"><header className="top"><Link className="logo" href="/">✦ RPG <span>STUDIO</span></Link><Link href="/marketplace">Marketplace →</Link></header>
 <section className="hero compact"><p className="eyebrow">PR #7 · INTERACTIVE PROTOTYPE</p><h1>Dice & Consequences</h1><p className="lead">The engine rolls. The animation reveals. The AI never chooses the outcome.</p></section>
 <section className="editor"><div className="location"><label htmlFor="kind">Roll type</label><select id="kind" value={kind} onChange={e=>{setKind(e.target.value as Kind);setReceipt(null);}}>{(["ability","attack","save","damage","healing"] as const).map(k=><option value={k} key={k}>{k==="ability"?"Ability / skill check":k==="attack"?"Attack vs AC":k==="save"?"Saving throw":k==="damage"?"Damage":"Healing"}</option>)}</select>
 <label htmlFor="modifier">Modifier</label><input id="modifier" type="number" min={-10} max={30} value={modifier} onChange={e=>setModifier(Number(e.target.value))}/>
 {check?<><label htmlFor="dc">{kind==="attack"?"Target Armor Class (AC)":"Difficulty Class (DC)"}</label><input id="dc" type="number" min={1} max={40} value={dc} onChange={e=>setDc(Number(e.target.value))}/><label htmlFor="mode">Roll mode</label><select id="mode" value={mode} onChange={e=>setMode(e.target.value as Mode)}><option value="normal">Normal · 1d20</option><option value="advantage">Advantage · 2d20 keep highest</option><option value="disadvantage">Disadvantage · 2d20 keep lowest</option></select></>:<><label htmlFor="sides">Die</label><select id="sides" value={sides} onChange={e=>setSides(Number(e.target.value))}>{[4,6,8,10,12,20].map(n=><option value={n} key={n}>d{n}</option>)}</select><label htmlFor="count">Number of dice</label><input id="count" type="number" min={1} max={10} value={count} onChange={e=>setCount(Number(e.target.value))}/></>}
 <div className="dice-stage" aria-live="polite"><div className={"die-face"+(rolling?" tumbling":"")} key={receipt?.id||"waiting"}>{rolling?"?":receipt?receipt.kept:"d20"}</div><div className="dice-result">{rolling?"Rolling…":receipt?<><strong>{receipt.dice.map(v=>String(v)).join(" · ")} {receipt.mode!=="normal"?"(kept "+receipt.kept+")":""}</strong><p>{receipt.kept} {receipt.modifier>=0?"+":"−"} {Math.abs(receipt.modifier)} = <strong>{receipt.total}</strong>{receipt.dc!==null?" vs "+receipt.dc:""}</p><h2 className={receipt.success===false?"error":"success"}>{receipt.success===null?receipt.consequence:receipt.success?"SUCCESS":"FAILURE"}</h2></>:"Ready to roll"}</div></div>
 <button disabled={rolling} onClick={roll}>{rolling?"Dice in motion…":"🎲 Roll dice"}</button>
 {error&&<p className="error" role="alert">{error}</p>}
 {receipt&&<p className="dice-receipt">Roll receipt: {receipt.id}<br/>Recorded {receipt.timestamp} · {receipt.kind} · d{receipt.sides}</p>}
 </div><p className="lead" style={{fontSize:14}}>This lab validates server-side rolls and the reveal animation. It does not yet apply damage, HP, or check outcomes to a persistent playthrough.</p></section>
 <style jsx>{`
 select{width:100%;padding:13px;border:1px solid #ffffff40;border-radius:9px;background:#1a2436;color:#fff;font:inherit}
 .dice-stage{display:flex;align-items:center;gap:28px;margin-top:28px;min-height:210px;padding:25px;border-radius:16px;background:radial-gradient(circle at 25% 40%,#31435e,#101827 70%);border:1px solid #e7b96b55}
 .die-face{display:grid;place-items:center;flex:none;width:135px;height:135px;clip-path:polygon(50% 0%,92% 22%,100% 72%,50% 100%,0% 72%,8% 22%);background:linear-gradient(145deg,#f8d99b,#9b5b25);color:#111827;font:bold 55px Georgia,serif;filter:drop-shadow(0 0 14px #f4c98566)}
 .tumbling{animation:tumble .24s linear infinite alternate}
 @keyframes tumble{0%{transform:rotate(-22deg) scale(.82)}100%{transform:rotate(28deg) scale(1.12)}}
 .dice-result{line-height:1.5;overflow-wrap:anywhere}.dice-result h2{font-size:28px;margin:5px 0}
 .dice-receipt{color:#aab3c6;font-size:12px;overflow-wrap:anywhere}
 @media(max-width:550px){.dice-stage{flex-direction:column;align-items:flex-start}}
 @media(prefers-reduced-motion:reduce){.tumbling{animation:none}}
 `}</style></main>;
}
