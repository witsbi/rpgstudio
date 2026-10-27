import type { Location } from "./engine.ts";
export function ordinaryExitMove(action:string,current:Location,locations:Location[]):string|null {
 const text=action.trim().toLowerCase().replace(/[.!?]+$/,"");
 // Only explicit traversal commands, never risky traversal or a compound action.
 if(!/^(?:i\s+)?(?:go|walk|move|travel|head|proceed|enter)(?:\s+through|\s+to|\s+into|\s+toward|\s+towards)?\b/.test(text))return null;
 if(/\b(jump|leap|climb|vault|swing|attack|hit|force|break|kick|fight|sneak|dash|run|rush|locked|jammed|trap|gap|chasm|pit)\b/.test(text))return null;
 const matches=current.exits.filter(id=>{
  const dest=locations.find(l=>l.id===id);
  if(!dest)return false;
  const name=dest.name.toLowerCase();
  return text.includes(name) || text.includes(id.toLowerCase());
 });
 return matches.length===1?matches[0]:null;
}
