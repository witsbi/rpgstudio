"use client";
import { useEffect, useState } from "react";
export default function LocationArt({ worldId, version, locationId }: { worldId: string; version: string; locationId: string }) {
 const [url,setUrl]=useState(""); const [status,setStatus]=useState("Loading illustration…");
 useEffect(() => {
  let cancelled=false;
  const endpoint="/api/worlds/"+encodeURIComponent(worldId)+"/illustration";
  const imageUrl=endpoint+"?locationId="+encodeURIComponent(locationId);
  async function load() {
   setUrl("");setStatus("Checking illustration…");
   try {
    const existing=await fetch(imageUrl,{cache:"no-store"});
    if(existing.ok){if(!cancelled){setUrl(imageUrl);setStatus("");}return;}
    if(existing.status!==404)throw Error("Could not check illustration");
    if(!cancelled)setStatus("Generating this location with Muse Image…");
    const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({version,locationId})});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||"Image generation failed");
    if(!cancelled){setUrl(result.url+"?v="+Date.now());setStatus("");}
   }catch(e){if(!cancelled)setStatus(e instanceof Error?e.message:"Illustration unavailable");}
  }
  void load();return()=>{cancelled=true;};
 },[worldId,version,locationId]);
 return <div style={{marginBottom:16}}>{url?<img src={url} alt="Illustration of current location" style={{width:"100%",borderRadius:12}}/>:<p aria-live="polite">{status}</p>}</div>;
}
