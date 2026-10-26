"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
type Game = { session: { id: string }; world: { title: string }; location: { name: string; description: string; exits: string[] }; turns: { id: string; playerAction: string; narration: string; rejectedProposal: boolean }[] };
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
    {game && <section className="editor"><article className="location"><p className="eyebrow">CURRENT LOCATION</p><h2>{game.location.name}</h2><p>{game.location.description}</p><small>Exits: {game.location.exits.join(", ") || "none"}</small></article>
      <div className="transcript">{game.turns.length === 0 && <p>Your adventure begins here. What do you do?</p>}{game.turns.map(turn => <article className="turn" key={turn.id}><p><strong>You:</strong> {turn.playerAction}</p><p><strong>DM:</strong> {turn.narration}</p>{turn.rejectedProposal && <small>The engine rejected a proposed state change.</small>}</article>)}</div>
      <form onSubmit={takeTurn}><label htmlFor="action">Your action</label><textarea id="action" rows={3} value={action} onChange={e => setAction(e.target.value)} disabled={busy} maxLength={2000}/><button disabled={busy || !action.trim()}>{busy ? "The DM is thinking…" : "Take turn"}</button></form>
    </section>}
    {error && <p role="alert" className="error">{error}</p>}
  </main>;
}
