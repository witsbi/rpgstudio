"use client";
import { useState } from "react";
import Link from "next/link";
type Location = { id: string; name: string; description: string; exits: string[]; position: { x: number; y: number } };
type World = { id: string; version: string; title: string; startLocationId: string; locations: Location[] };
export default function Creator() {
  const [prompt, setPrompt] = useState("An abandoned observatory overlooking a stormy sea, where a strange signal calls adventurers underground.");
  const [world, setWorld] = useState<World | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);
  async function generate() {
    setBusy(true); setError(""); setPublished(false); setWorld(null);
    try {
      const res = await fetch("/api/creator", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setWorld(data.world);
    } catch (e) { setError(e instanceof Error ? e.message : "Generation failed"); } finally { setBusy(false); }
  }
  async function publish() {
    if (!world) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/worlds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(world) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");
      setPublished(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Publish failed"); } finally { setBusy(false); }
  }
  return <main className="shell"><header className="top"><Link className="logo" href="/">✦ RPG <span>STUDIO</span></Link><Link href="/marketplace">Marketplace →</Link></header>
    <section className="hero compact"><p className="eyebrow">CREATOR</p><h1>Imagine a <em>world.</em></h1><p className="lead">Describe a world. AI proposes its locations and paths. You decide whether to publish it.</p></section>
    <section className="editor"><label htmlFor="prompt">Your world idea</label><textarea id="prompt" rows={5} value={prompt} onChange={e => setPrompt(e.target.value)} disabled={busy}/><button onClick={generate} disabled={busy}>{busy ? "Working…" : "Generate with AI"}</button>
      {error && <p role="alert" className="error">{error}</p>}
      {world && <section className="preview"><p className="eyebrow">REVIEW BEFORE PUBLISHING</p><label htmlFor="world-title">World title</label><input id="world-title" value={world.title} onChange={e => setWorld({ ...world, title: e.target.value })}/><p>Starting location: {world.startLocationId}</p>
        <div className="locations">{world.locations.map((loc, i) => <article className="location" key={loc.id}><label htmlFor={`name-${i}`}>Location {i + 1}</label><input id={`name-${i}`} value={loc.name} onChange={e => setWorld({ ...world, locations: world.locations.map((l,j) => j===i ? {...l,name:e.target.value} : l) })}/><label htmlFor={`desc-${i}`}>Description</label><textarea id={`desc-${i}`} rows={3} value={loc.description} onChange={e => setWorld({ ...world, locations: world.locations.map((l,j) => j===i ? {...l,description:e.target.value} : l) })}/><small>Exits: {loc.exits.join(", ") || "none"}</small></article>)}</div>
        {published ? <p className="success">Published! <Link href="/marketplace">View in Marketplace →</Link></p> : <button onClick={publish} disabled={busy}>Approve & Publish to Marketplace</button>}
      </section>}
    </section></main>;
}
