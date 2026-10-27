"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function DmLaunch({ adventureId, version }: { adventureId: string; version: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/dm-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adventureId, version }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || "Unable to start");
      router.push(`/dm/${encodeURIComponent(data.sessionId)}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to start"); setBusy(false); }
  }
  return <div><button className="launch-button" disabled={busy} onClick={start}>{busy ? "Starting…" : "Be the DM · AI Player →"}</button>{error && <p className="error" role="alert">{error}</p>}</div>;
}
