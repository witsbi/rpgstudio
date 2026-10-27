import type { Engine, Location, GameEvent } from "../../src/engine.ts";
import { resolveRoll, type RollReceipt } from "../../src/dice.ts";
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type Message = { role: string; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };
const tools = [
  { type: "function", function: { name: "inspect", description: "Inspect or investigate a specific feature in the current location. The human DM adjudicates what is found.", parameters: { type: "object", properties: { target: { type: "string" } }, required: ["target"] } } },
  { type: "function", function: { name: "interact", description: "Attempt to speak to, use, or manipulate something. The human DM determines the outcome.", parameters: { type: "object", properties: { intent: { type: "string" } }, required: ["intent"] } } },
  { type: "function", function: { name: "move", description: "Travel through an available exit. Engine checks connectivity and updates state.", parameters: { type: "object", properties: { locationId: { type: "string" } }, required: ["locationId"] } } }
];
export async function runSparkPlayer(input: {
  engine: Engine; sessionId: string; scene: string; key: string;
  history: { dmScene: string; aiResponse: string }[];
  availableExits: { id: string; name: string }[]; turnsSinceMove: number;
}): Promise<{ narration: string; event: GameEvent | null; rejected: boolean; roll: RollReceipt | null }> {
  const { engine, sessionId, scene, key, history, availableExits, turnsSinceMove } = input;
  const location: Location = engine.getContext(sessionId).location;
  const messages: Message[] = [
    { role: "developer", content: "You are an autonomous RPG PLAYER, never the DM. The human DM determines the world and all outcomes. Choose an actual action each turn by calling inspect, interact or move. Do not repeatedly inspect the same clue without new evidence. Maintain a goal, explore when stuck, and do not claim an action succeeded until its result confirms it. If turnsSinceMove >= 4, favor moving through a valid exit unless the DM presents an immediate obstacle. Tool results saying pending DM adjudication are NOT success. After a tool result, briefly declare your attempted action in first person; do not invent findings. Do not call further tools after a pending-DM result." },
    { role: "user", content: JSON.stringify({ dmScene: scene, location, availableExits, turnsSinceMove, history }) }
  ];
  let event: GameEvent | null = null;
  let rejected = false;
  let roll: RollReceipt | null = null;
  let attempted = "";
  for (let step = 0; step < 3; step++) {
    const response = await fetch(`${(process.env.META_API_BASE_URL || "https://api.meta.ai/v1").replace(/\/$/, "")}/chat/completions`, {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.META_MODEL || "muse-spark-1.3", messages, tools, tool_choice: "auto" })
    });
    if (!response.ok) {
      const details = (await response.text()).slice(0, 1200);
      console.error("Muse Spark API error:", response.status, details);
      throw new Error(`Muse Spark HTTP ${response.status}: ${details.replace(/Bearer\\s+[^\\s"]+/gi, "Bearer [redacted]")}`);
    }
    const body = await response.json() as { choices?: { message?: Message }[] };
    const message = body.choices?.[0]?.message;
    if (!message) throw new Error("Muse returned no message");
    messages.push(message);
    if (!message.tool_calls?.length) {
      const narration = (message.content || "").trim() || attempted;
      if (!narration) throw new Error("AI Player did not declare an action");
      return { narration, event, rejected, roll };
    }
    for (const call of message.tool_calls) {
      let observation: string;
      let args: Record<string, unknown>;
      try { args = JSON.parse(call.function.arguments) as Record<string, unknown>; }
      catch { args = {}; }
      if (call.function.name === "move" && typeof args.locationId === "string") {
        try {
          const destination = availableExits.find(x => x.id === args.locationId);
          if (!destination) throw Error("Exit unavailable");
          // Prototype hazard policy: terrain explicitly described as hazardous, including stairs.
          // The human DM remains authoritative over the scene; this is not a general rules engine.
          const hazardous = /\\b(stairs?|staircase|slippery|slick|treacherous|unstable|hazard|dangerous|crumbling|narrow ledge)\\b/i.test(
            [location.name, location.description, scene, destination.name].join(" ")
          );
          attempted = `I attempt to travel to ${destination.name}.`;
          if (hazardous) {
            roll = resolveRoll({kind:"ability",dc:12,modifier:0,mode:"normal"});
            if (!roll.success) {
              rejected = true;
              observation = JSON.stringify({accepted:false,reason:"Hazard check failed; location unchanged",roll:{total:roll.total,dc:roll.dc,success:false}});
            } else {
              event = engine.applyAction(sessionId,"meta-muse-player",{type:"move",locationId:args.locationId});
              observation = JSON.stringify({accepted:true,outcome:event.outcome,roll:{total:roll.total,dc:roll.dc,success:true},location:engine.getContext(sessionId).location.name});
            }
          } else {
            event = engine.applyAction(sessionId,"meta-muse-player",{type:"move",locationId:args.locationId});
            observation = JSON.stringify({accepted:true,outcome:event.outcome,location:engine.getContext(sessionId).location.name});
          }
        } catch { rejected = true; attempted = `I try to travel toward ${args.locationId}.`; observation = JSON.stringify({ accepted: false, reason: "Exit unavailable; world state unchanged" }); }
      } else if (call.function.name === "inspect" && typeof args.target === "string") {
        attempted = `I inspect ${args.target.slice(0, 160)}.`;
        observation = JSON.stringify({ pendingDmAdjudication: true, action: attempted });
      } else if (call.function.name === "interact" && typeof args.intent === "string") {
        attempted = `I attempt to ${args.intent.slice(0, 160)}.`;
        observation = JSON.stringify({ pendingDmAdjudication: true, action: attempted });
      } else { rejected = true; attempted = "I reconsider my next action."; observation = JSON.stringify({ accepted: false, reason: "Invalid tool or arguments" }); }
      messages.push({ role: "tool", tool_call_id: call.id, content: observation });
    }
  }
  return { narration: attempted || "I pause and reconsider my next action.", event, rejected, roll };
}
