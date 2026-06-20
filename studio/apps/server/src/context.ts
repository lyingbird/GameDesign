// Context assembler: builds the per-node Claude system prompt from the knowledge
// base (node card + relevant methodology + matched genre) + the design blackboard.
// Stable KB text goes first so prompt-caching can cache the prefix.
import { loadKb, nodeCard, methodologyFor, matchGenre } from "@gdf/shared/kb";
import { NODE_BY_ID, stageLabel, CUSTOM_OPTION_ID } from "@gdf/shared";
import type { NodeDef } from "@gdf/shared";

const BASE_RULES = `你是 GameDesignFlow 的游戏设计协同引擎中的一个"节点"。你按"提出带推荐的多选问题 → 用户作答 → 收敛 → 检查点确认"的方式，与用户共创一份游戏设计文档（GDD）。

通用规范（务必遵守）：
- 每个问题给 3–4 个具体、互斥的选项；必须始终保留 option_id:${CUSTOM_OPTION_ID} 的"其他/自定义（请在 text 字段填写自由描述）"。
- 必须给一个"推荐项"，并在 message 里用一段话**论证为什么推荐它**，且论证要引用已确认的设计上下文（品类/题材/支柱/单人开发等约束）。
- 单人/小团队是常见约束：优先可控的系统、可复用内容、低美术产能压力的方案。
- 用户的自定义自由文本是**强约束**，必须据此调整后续推荐，而不是无视。
- 当本节点该定的维度都已确认，输出 action:"finalize"，给一张 markdown「确认卡」(preview_markdown) 汇总本节点结论，并给决策选项：option_id:1 "同意继续"，以及针对每个已定维度的"换X"选项，外加 option_id:0 自定义。
- 当用户在检查点选择"换某维度"时，**只重做该维度**，保留其它已确认结论。`;

export function buildNodeSystemPrompt(node: NodeDef, designContext: Record<string, unknown>): string {
  const kb = loadKb();
  const card = nodeCard(kb, node.id);
  const methods = methodologyFor(kb, node.id);
  const genreText = String((designContext.genre as string) ?? designContext.query ?? "");
  const genre = matchGenre(kb, genreText);

  const parts: string[] = [BASE_RULES];
  parts.push(`\n## 当前节点\n${stageLabel(node)}（${node.id}，第 ${node.seq}/11 步）`);
  if (card) parts.push(`\n## 节点说明书\n${card.body.trim()}`);
  if (methods.length) parts.push(`\n## 相关设计方法论\n` + methods.map((m) => `### ${m.id}\n${m.body.trim()}`).join("\n\n"));
  if (genre) parts.push(`\n## 品类知识：${genre.id}\n${genre.body.trim()}`);
  return parts.join("\n");
}

export function designContextSummary(designContext: Record<string, unknown>): string {
  const { query, sections, ...confirmed } = designContext as Record<string, unknown>;
  return [
    `用户最初的一句话需求：${String(query ?? "")}`,
    `已确认的设计上下文（JSON）：\n${JSON.stringify(confirmed, null, 2)}`,
  ].join("\n");
}

export { NODE_BY_ID };
