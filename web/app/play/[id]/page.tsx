"use client";
import Link from "next/link";
import LocationArt from "../../components/location-art";
import { use, useEffect, useState } from "react";
type Game = { session: { id: string; adventureId: string; adventureVersion: string }; world: { title: string }; location: { id: string; name: string; description: string; exits: string[] }; turns: { id: string; playerAction: string; narration: string; rejectedProposal: boolean; roll?: { id: string; kind: string; dice: number[]; kept: number; modifier: number; total: number; dc: number | null; success: boolean | null; sides: number; mode: string } | null }[] };
export default function Play({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [game, setGame] = useState<Game | null>(null);
  const [action, setAction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending,setPending]=useState<{id:string;action:string;stakes:string;roll:Game["turns"][number]["roll"]}|null>(null);
  const [revealing,setRevealing]=useState(false);
  useEffect(() => {
    fetch(`/api/sessions/${encodeURIComponent(id)}`).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setGame(data); fetch(`/api/turn-flow?sessionId=${encodeURIComponent(id)}`).then(r=>r.json()).then(x=>{if(x.pending)setPending(x.pending);}).catch(()=>{}); }).catch(e => setError(String(e)));
  }, [id]);
  async function requestFlow(payload:object) {
    const response=await fetch("/api/turn-flow",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:id,...payload})});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||"Turn failed");
    return data;
  }
  async function finishTurn(idToResolve:string){
    const result=await requestFlow({phase:"resolve",pendingId:idToResolve});
    setGame(result);setPending(null);setAction("");
  }
  async function takeTurn(e:React.FormEvent){
    e.preventDefault();if(!action.trim()||busy||pending)return;
    setBusy(true);setError("");
    try{
      const prepared=await requestFlow({phase:"prepare",action});
      setPending(prepared);
      if(prepared.roll){
        setRevealing(true);
        await new Promise(resolve=>setTimeout(resolve,1600));
        setRevealing(false);
      }
      await finishTurn(prepared.id);
    }catch(e){setError(e instanceof Error?e.message:"Turn failed");}
    finally{setBusy(false);setRevealing(false);}
  }
  async function resumePending(){
    if(!pending)return;setBusy(true);setError("");
    try{await finishTurn(pending.id);}catch(e){setError(e instanceof Error?e.message:"Turn failed");}finally{setBusy(false);}
  }
  return <main className="shell"><header className="top"><Link className="logo" href="/">✦ RPG <span>STUDIO</span></Link><Link href="/marketplace">Marketplace →</Link></header>
    <section className="hero compact"><p className="eyebrow">HUMAN PLAYER · AI DUNGEON MASTER</p><h1>{game?.world.title || "Loading adventure…"}</h1><p className="lead">This session has its own state and history. Bookmark this page to resume.</p></section>
    {game && <section className="editor"><article className="location"><p className="eyebrow">CURRENT LOCATION</p><h2>{game.location.name}</h2><LocationArt worldId={game.session.adventureId} version={game.session.adventureVersion} locationId={game.location.id} /><p>{game.location.description}</p><small>Exits: {game.location.exits.join(", ") || "none"}</small></article>
      {pending&&<div className="play-roll" role="status" aria-live="polite"><div className={"play-die"+(revealing?" dice-tumbling":"")}>{revealing?"?":pending.roll?.kept??"—"}</div><div><strong>{pending.stakes}</strong><p>{revealing?"The engine has rolled. Revealing the dice…":pending.roll?`${pending.roll.dice.join(", ")} · Total ${pending.roll.total} vs ${pending.roll.dc} · ${pending.roll.success?"SUCCESS":"FAILURE"}`:"No dice needed"}</p>{!busy&&<button type="button" onClick={resumePending}>Continue adventure</button>}</div></div>}
      <div className="transcript">{game.turns.length === 0 && <p>Your adventure begins here. What do you do?</p>}{game.turns.map(turn => <article className="turn" key={turn.id}><p><strong>You:</strong> {turn.playerAction}</p><p><strong>DM:</strong> {turn.narration}</p>{turn.roll && <div className="play-roll" key={turn.roll.id}><div className="play-die">{turn.roll.kept}</div><div><strong>{turn.roll.kind.toUpperCase()} · {turn.roll.dice.length}d{turn.roll.sides}</strong><p>{turn.roll.dice.join(", ")} · {turn.roll.kept} {turn.roll.modifier >= 0 ? "+" : "−"} {Math.abs(turn.roll.modifier)} = {turn.roll.total}{turn.roll.dc !== null ? ` vs DC/AC ${turn.roll.dc}` : ""}</p><strong>{turn.roll.success === null ? "Resolved" : turn.roll.success ? "SUCCESS" : "FAILURE"}</strong><small> · Engine roll receipt {turn.roll.id.slice(0,8)}</small></div></div>}{turn.rejectedProposal && <small>The engine rejected a proposed state change.</small>}</article>)}</div>
      <form onSubmit={takeTurn}><label htmlFor="action">Your action</label><textarea id="action" rows={3} value={action} onChange={e => setAction(e.target.value)} disabled={busy||!!pending} maxLength={2000}/><button disabled={busy || !!pending || !action.trim()}>{busy ? "Resolving action…" : "Take turn"}</button></form>
    </section>}
    <style jsx>{`.play-roll{display:flex;align-items:center;gap:18px;padding:16px;margin:12px 0;background:#171f31;border:1px solid #e7b96b66;border-radius:12px}.play-die{width:75px;height:75px;flex:none;display:grid;place-items:center;clip-path:polygon(50% 0,95% 25%,95% 75%,50% 100%,5% 75%,5% 25%);background:linear-gradient(145deg,#ffe4a7,#bc762e);color:#141827;font:bold 32px Georgia,serif;animation:land .75s ease-out both} .dice-tumbling{animation:tumble .18s linear infinite alternate}@keyframes tumble{0%{transform:rotate(-25deg) scale(.8)}100%{transform:rotate(35deg) scale(1.12)}}@keyframes land{0%{transform:rotate(-200deg) scale(.25);opacity:.2}65%{transform:rotate(20deg) scale(1.15)}100%{transform:rotate(0) scale(1);opacity:1}}@media(prefers-reduced-motion:reduce){.play-die{animation:none}.dice-tumbling{animation:none}}.play-roll p{margin:5px 0;font-size:14px}`}</style>
    {error && <p role="alert" className="error">{error}</p>}
  </main>;
}
