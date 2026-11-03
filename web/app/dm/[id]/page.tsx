"use client";
import Link from "next/link";
import LocationArt from "../../components/location-art";
import { use, useEffect, useState } from "react";
type Game = { session: { adventureId: string; adventureVersion: string }; world: { title: string }; location: { id: string; name: string; description: string; exits: string[] }; turns: { id: string; playerAction: string; narration: string; rejectedProposal: boolean; roll?: {id:string;kind:string;total:number;dc:number|null;success:boolean|null;dice:number[]} | null }[]; privateNotes: {id:string;text:string;revealed:boolean}[] };
export default function DmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [game, setGame] = useState<Game | null>(null);
  const [scene, setScene] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/dm-sessions/${encodeURIComponent(id)}`).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setGame(data); }).catch(e => setError(String(e))); }, [id]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!scene.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/dm-sessions/${encodeURIComponent(id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scene }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || "Turn failed");
      setGame(data); setScene("");
    } catch (e) { setError(e instanceof Error ? e.message : "Turn failed"); } finally { setBusy(false); }
  }
  async function saveSecret() {
    if (!secret.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const r=await fetch(`/api/dm-sessions/${encodeURIComponent(id)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operation:"save-note",noteId:`note-${Date.now()}`,text:secret})});
      const data=await r.json(); if(!r.ok)throw Error(data.error||"Unable to save note");
      setGame(data);setSecret("");
    } catch(e) {setError(e instanceof Error?e.message:"Unable to save note");} finally {setBusy(false);}
  }
  return <main className="shell"><header className="top"><Link className="logo" href="/">✦ RPG <span>STUDIO</span></Link><Link href="/marketplace">Marketplace →</Link></header>
    <section className="hero compact"><p className="eyebrow">HUMAN DUNGEON MASTER · AI PLAYER</p><h1>{game?.world.title || "Loading adventure…"}</h1><p className="lead">You guide the story. The AI plays a character. Bookmark this session to resume.</p></section>
    {game && <section className="editor"><article className="location"><p className="eyebrow">CURRENT LOCATION</p><h2>{game.location.name}</h2><LocationArt worldId={game.session.adventureId} version={game.session.adventureVersion} locationId={game.location.id} /><p>{game.location.description}</p><small>Exits: {game.location.exits.join(", ") || "none"}</small></article>
      <div className="transcript">{game.turns.length === 0 && <p>Set the opening scene for your AI Player.</p>}{game.turns.map(t => <article className="turn" key={t.id}><p><strong>You (DM):</strong> {t.playerAction}</p>{t.roll && <div><strong>Engine roll: {t.roll.kind} · {t.roll.dice.join(", ")} = {t.roll.total} vs DC {t.roll.dc} · {t.roll.success ? "SUCCESS" : "FAILURE"}</strong><small> · Receipt {t.roll.id.slice(0,8)}</small></div>}<p><strong>AI Player:</strong> {t.narration}</p>{t.rejectedProposal && <small>The engine rejected a proposed move.</small>}</article>)}</div>
      <section className="editor"><h2>DM-only notes</h2><p>These notes are stored separately and are not sent to the AI Player. Do not include secrets in the scene description until you intend to reveal them.</p>{game.privateNotes?.map(note=><article key={note.id}><strong>Private</strong><p>{note.text}</p></article>)}<label htmlFor="dm-secret">New private note</label><textarea id="dm-secret" value={secret} onChange={e=>setSecret(e.target.value)} maxLength={2000} rows={3} disabled={busy}/><button type="button" disabled={busy||!secret.trim()} onClick={saveSecret}>Save private note</button></section>
      <form onSubmit={submit}><label htmlFor="scene">Describe the scene or ask the player what they do</label><textarea id="scene" rows={4} maxLength={2000} value={scene} onChange={e => setScene(e.target.value)} disabled={busy}/><button disabled={busy || !scene.trim()}>{busy ? "AI Player is thinking…" : "Continue story"}</button></form>
    </section>}
    {error && <p role="alert" className="error">{error}</p>}
  </main>;
}
