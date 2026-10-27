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
  useEffect(() => {
    fetch(`/api/sessions/${encodeURIComponent(id)}`).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setGame(data); }).catch(e => setError(String(e)));
  }, [id]);
  async function takeTurn(e: React.FormEvent) {
    e.preventDefault(); if (!action.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Turn failed");
      setGame(data); setAction("");
    } catch (e) { setError(e instanceof Error ? e.message : "Turn failed"); } finally { setBusy(false); }
  }
  return <main className="shell"><header className="top"><Link className="logo" href="/">✦ RPG <span>STUDIO</span></Link><Link href="/marketplace">Marketplace →</Link></header>
    <section className="hero compact"><p className="eyebrow">HUMAN PLAYER · AI DUNGEON MASTER</p><h1>{game?.world.title || "Loading adventure…"}</h1><p className="lead">This session has its own state and history. Bookmark this page to resume.</p></section>
    {game && <section className="editor"><article className="location"><p className="eyebrow">CURRENT LOCATION</p><h2>{game.location.name}</h2><LocationArt worldId={game.session.adventureId} version={game.session.adventureVersion} locationId={game.location.id} /><p>{game.location.description}</p><small>Exits: {game.location.exits.join(", ") || "none"}</small></article>
      <div className="transcript">{game.turns.length === 0 && <p>Your adventure begins here. What do you do?</p>}{game.turns.map(turn => <article className="turn" key={turn.id}><p><strong>You:</strong> {turn.playerAction}</p><p><strong>DM:</strong> {turn.narration}</p>{turn.roll && <div className="play-roll" key={turn.roll.id}><div className="play-die">{turn.roll.kept}</div><div><strong>{turn.roll.kind.toUpperCase()} · {turn.roll.dice.length}d{turn.roll.sides}</strong><p>{turn.roll.dice.join(", ")} · {turn.roll.kept} {turn.roll.modifier >= 0 ? "+" : "−"} {Math.abs(turn.roll.modifier)} = {turn.roll.total}{turn.roll.dc !== null ? ` vs DC/AC ${turn.roll.dc}` : ""}</p><strong>{turn.roll.success === null ? "Resolved" : turn.roll.success ? "SUCCESS" : "FAILURE"}</strong><small> · Engine roll receipt {turn.roll.id.slice(0,8)}</small></div></div>}{turn.rejectedProposal && <small>The engine rejected a proposed state change.</small>}</article>)}</div>
      <form onSubmit={takeTurn}><label htmlFor="action">Your action</label><textarea id="action" rows={3} value={action} onChange={e => setAction(e.target.value)} disabled={busy} maxLength={2000}/><button disabled={busy || !action.trim()}>{busy ? "The DM is thinking…" : "Take turn"}</button></form>
    </section>}
    <style jsx>{`.play-roll{display:flex;align-items:center;gap:18px;padding:16px;margin:12px 0;background:#171f31;border:1px solid #e7b96b66;border-radius:12px}.play-die{width:75px;height:75px;flex:none;display:grid;place-items:center;clip-path:polygon(50% 0,95% 25%,95% 75%,50% 100%,5% 75%,5% 25%);background:linear-gradient(145deg,#ffe4a7,#bc762e);color:#141827;font:bold 32px Georgia,serif;animation:land .75s ease-out both}@keyframes land{0%{transform:rotate(-200deg) scale(.25);opacity:.2}65%{transform:rotate(20deg) scale(1.15)}100%{transform:rotate(0) scale(1);opacity:1}}@media(prefers-reduced-motion:reduce){.play-die{animation:none}}.play-roll p{margin:5px 0;font-size:14px}`}</style>
    {error && <p role="alert" className="error">{error}</p>}
  </main>;
}
