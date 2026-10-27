import { resolveRoll, type RollReceipt, type RollRequest } from "./dice.ts";
/** Prototype rules: explicit physical actions only; fixed DC/AC until character sheets and target stats exist. */
export function checkForAction(action: string): { request: RollRequest; label: string } | null {
 const text = action.trim().toLowerCase();
 if (/\b(attack|hit|strike|punch|slash|stab|shoot)\b/.test(text)) return {request:{kind:"attack",modifier:0,dc:12},label:"Attack vs prototype AC 12"};
 if (/\b(jump|leap|climb|vault|balance|swing)\b/.test(text)) return {request:{kind:"ability",modifier:0,dc:12},label:"Athletics / Acrobatics vs prototype DC 12"};
 if (/\b(pick.*lock|sneak|hide|persuade|intimidate)\b/.test(text)) return {request:{kind:"ability",modifier:0,dc:12},label:"Skill check vs prototype DC 12"};
 return null;
}
export function rollForAction(action: string): { receipt: RollReceipt; label: string } | null {
 const check=checkForAction(action);
 return check?{receipt:resolveRoll(check.request),label:check.label}:null;
}
