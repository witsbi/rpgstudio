"use client";
import { useState } from "react";
export default function Illustrate({ id, version, locationId }: { id: string; version: string; locationId: string }) {
 const [url,setUrl]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
 async function generate() {
  setBusy(true);setError("");
  try {
   const r=await fetch("/api/worlds/"+id+"/illustration",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({version,locationId})});
   const data=await r.json();if(!r.ok)throw Error(data.error||"Generation failed");
   setUrl(data.url+"&v="+Date.now());
  }catch(e){setError(e instanceof Error?e.message:"Generation failed");}finally{setBusy(false);}
 }
 return <div><button disabled={busy} onClick={generate}>{busy?"Illustrating…":"Illustrate starting location with Muse Image"}</button>{url&&<img src={url} alt="Illustrated starting location" style={{width:"100%",borderRadius:12,marginTop:12}}/>}{error&&<p role="alert">{error}</p>}</div>;
}
