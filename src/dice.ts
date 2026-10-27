import { randomInt, randomUUID } from "node:crypto";

export type RollKind = "ability" | "attack" | "save" | "damage" | "healing";
export type RollMode = "normal" | "advantage" | "disadvantage";
export type RollRequest = { kind: RollKind; modifier: number; dc?: number; sides?: 4 | 6 | 8 | 10 | 12 | 20; count?: number; mode?: RollMode };
export type RollReceipt = { id: string; timestamp: string; kind: RollKind; sides: number; dice: number[]; kept: number; modifier: number; total: number; dc: number | null; success: boolean | null; mode: RollMode; consequence: string };

export function resolveRoll(input: RollRequest, die: (sides: number) => number = sides => randomInt(1, sides + 1)): RollReceipt {
 const { kind, modifier } = input;
 if (!["ability","attack","save","damage","healing"].includes(kind)) throw Error("Invalid roll kind");
 if (!Number.isInteger(modifier) || modifier < -10 || modifier > 30) throw Error("Invalid modifier");
 const check = kind === "ability" || kind === "attack" || kind === "save";
 const mode = input.mode ?? "normal";
 if (!["normal","advantage","disadvantage"].includes(mode)) throw Error("Invalid roll mode");
 if (!check && mode !== "normal") throw Error("Advantage only applies to d20 checks");
 const sides = check ? 20 : input.sides ?? 6;
 const count = check ? (mode === "normal" ? 1 : 2) : input.count ?? 1;
 if (!check && (![4,6,8,10,12,20].includes(sides) || !Number.isInteger(count) || count < 1 || count > 10)) throw Error("Invalid damage/healing dice");
 const dc = check ? input.dc : undefined;
 if (check && (!Number.isInteger(dc) || (dc as number) < 1 || (dc as number) > 40)) throw Error("Invalid DC/AC");
 const dice = Array.from({length: count}, () => {
  const value = die(sides);
  if (!Number.isInteger(value) || value < 1 || value > sides) throw Error("Invalid die result");
  return value;
 });
 const kept = check ? (mode === "advantage" ? Math.max(...dice) : mode === "disadvantage" ? Math.min(...dice) : dice[0]) : dice.reduce((a,b)=>a+b,0);
 const total = check ? kept + modifier : Math.max(0,kept + modifier);
 const success = check ? total >= (dc as number) : null;
 const consequence = check ? (success ? "Check succeeds" : "Check fails") : kind === "damage" ? `Deal ${total} damage` : `Restore ${total} HP`;
 return { id: randomUUID(), timestamp: new Date().toISOString(), kind, sides, dice, kept, modifier, total, dc: check ? dc! : null, success, mode, consequence };
}
