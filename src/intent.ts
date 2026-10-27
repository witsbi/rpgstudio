import type { Location } from "./engine.ts";
import { checkForAction } from "./action-check.ts";

export type PlayerIntent =
 | {kind:"move"; destinationId:string; requiresCheck:false; source:"explicit"|"text"}
 | {kind:"risky"; requiresCheck:true; reason:string}
 | {kind:"other"; requiresCheck:false};

const risky=/\b(jump|leap|climb|vault|swing|balance|attack|hit|strike|punch|slash|stab|shoot|force|break|kick|fight|sneak|hide|pick|persuade|intimidate|dash|run|rush)\b/i;
const travel=/^(?:i\s+)?(?:go|walk|move|travel|head|proceed|enter|step)(?:\s+through|\s+to|\s+into|\s+toward|\s+towards|\s+down|\s+up)?\b/i;

/** Parse only unambiguous intentions. Unknown actions remain with the DM assessor. */
export function parsePlayerIntent(action:string,location:Location,locations:Location[],explicitDestination?:string):PlayerIntent {
 if(explicitDestination!==undefined) {
  if(!location.exits.includes(explicitDestination))throw Error("Destination is not a connected exit");
  return {kind:"move",destinationId:explicitDestination,requiresCheck:false,source:"explicit"};
 }
 if(risky.test(action))return {kind:"risky",requiresCheck:true,reason:"Explicit risky action"};
 if(travel.test(action.trim()) && !/\b(and|then|while|after|before)\b/i.test(action)) {
  const normalized=action.toLowerCase();
  const matches=location.exits.filter(id=>{
   const destination=locations.find(l=>l.id===id);
   return destination && (normalized.includes(destination.name.toLowerCase()) || normalized.includes(id.toLowerCase()));
  });
  if(matches.length===1)return {kind:"move",destinationId:matches[0],requiresCheck:false,source:"text"};
 }
 if(checkForAction(action))return {kind:"risky",requiresCheck:true,reason:"Rules-classified action"};
 return {kind:"other",requiresCheck:false};
}
