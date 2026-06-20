// Deterministic final-GDD assembly from the drafted sections (see kb/gdd-schema/
// assembly-notes.md). simulate_verify calls this to produce the final markdown.
const CHAPTER_TITLES: Record<number, string> = {
  1: "游戏概述", 2: "核心幻想", 3: "设计支柱与反支柱", 4: "品类定位与竞品", 5: "核心循环",
  6: "系统设计", 7: "资源经济", 8: "数值框架", 9: "内容规划", 10: "风险与待定",
};

export function assembleFinal(designContext: Record<string, unknown>): string {
  const sections = ((designContext.sections as any[]) ?? []).slice().sort((a, b) => a.gdd_section - b.gdd_section);
  const name = String((designContext.title as string) ?? (designContext.name as string) ?? "未命名");
  const out: string[] = [`# 《${name}》（暂名）GDD 骨架策划案 v0.2`, ""];
  for (let ch = 1; ch <= 10; ch++) {
    const s = sections.find((x) => x.gdd_section === ch);
    out.push("---", "");
    if (s) out.push(s.markdown.trim(), "");
    else out.push(`## ${ch}. ${CHAPTER_TITLES[ch]}`, "_（本章待补充）_", "");
  }
  // trailing 确认卡 (per assembly-notes.md)
  const covered = sections.map((s) => s.gdd_section);
  out.push("---", "", "## 确认卡", "");
  for (let ch = 1; ch <= 10; ch++) out.push(`- ${covered.includes(ch) ? "✅" : "⬜"} 第 ${ch} 章 ${CHAPTER_TITLES[ch]}`);
  out.push("", "```json", JSON.stringify({ version: "0.2", phase_complete: true, status: "done", summary: [] }, null, 2), "```");
  return out.join("\n");
}
