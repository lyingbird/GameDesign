// KB + harness smoke test (no LLM): verify the knowledge base loads and the
// context assembler builds a coherent per-node system prompt.
import { loadKb, methodologyFor, matchGenre } from "@gdf/shared/kb";
import { NODES, NODE_BY_ID } from "@gdf/shared";
import { buildNodeSystemPrompt } from "./context.js";

const kb = loadKb();
console.log("KB loaded:");
console.log("  nodes:", kb.nodes.length, kb.nodes.map((n) => n.id).join(","));
console.log("  methodology:", kb.methodology.length, kb.methodology.map((m) => m.id).join(","));
console.log("  genres:", kb.genres.length);
console.log("  gddSchema:", kb.gddSchema.length, kb.gddSchema.map((g) => g.id).join(","));

const g = matchGenre(kb, "我想做一个塔防游戏");
console.log("\nmatchGenre('塔防') ->", g?.id);

for (const node of NODES.filter((n) => n.type === "interactive")) {
  const methods = methodologyFor(kb, node.id).map((m) => m.id);
  console.log(`\n[${node.seq}] ${node.id}: methodology=[${methods.join(",")}]`);
}

const prompt = buildNodeSystemPrompt(NODE_BY_ID["creative_intake"], { query: "我想做一个塔防游戏，单人开发" });
console.log("\n--- creative_intake system prompt length:", prompt.length, "chars ---");
console.log(prompt.slice(0, 600));
