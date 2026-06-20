// Mock implementations for GDF_MOCK=1 mode.
// Returns schema-valid fixtures so the full pipeline runs without an Anthropic key.
import { NextStepSchema, SectionSchema, ReviewSchema, ValidationReportSchema } from "@gdf/shared";
import type { NextStep, SectionOutput, ReviewOutput, ValidationReport } from "@gdf/shared";

interface Call { client: unknown; model: string; system: string; user: string }

/** Count completed Q/A pairs from the engine's buildUserTurn format: "Q1: …\nA1: …" */
function countQAPairs(user: string): number {
  // Each pair has a line starting with Q<digit(s)>:
  const matches = user.match(/^Q\d+:/gm);
  return matches ? matches.length : 0;
}

/** Cheaply extract a node hint from the system prompt (first line after "# "). */
function nodeHint(system: string): string {
  const m = system.match(/#+\s+(.+)/);
  return m ? m[1].trim() : "当前节点";
}

export function mockNextStep(call: Call): Promise<NextStep> {
  const priorPairs = countQAPairs(call.user);
  const hint = nodeHint(call.system);

  let result: NextStep;
  if (priorPairs < 2) {
    result = NextStepSchema.parse({
      action: "ask",
      question: `(mock) [${hint}] 这一步想怎么定？`,
      message: "(mock) 我建议选 1，因为它最贴合已确认上下文。",
      options: [
        { option_id: 1, text: "(mock) 推荐选项" },
        { option_id: 2, text: "(mock) 备选" },
        { option_id: 0, text: "其他/自定义（请在 text 字段填写自由描述）" },
      ],
      recommended_option_id: 1,
    });
  } else {
    result = NextStepSchema.parse({
      action: "finalize",
      checkpoint: {
        title: "(mock) 确认卡",
        preview_markdown: "### 确认卡\n\n(mock) 本节点结论汇总…",
        options: [
          { option_id: 1, text: "同意继续" },
          { option_id: 2, text: "换个方向" },
          { option_id: 0, text: "其他/自定义" },
        ],
        recommended_option_id: 1,
      },
      confirmed: {},
    });
  }
  return Promise.resolve(result);
}

export function mockGenerateSections(call: Call): Promise<SectionOutput> {
  // Echo a short excerpt of user context so output is visibly derived from input.
  const excerpt = call.user.slice(0, 80).replace(/\n/g, " ");
  const result = SectionSchema.parse({
    sections: [
      {
        gdd_section: 1,
        title: "(mock) 游戏概述",
        markdown: `## 1 游戏概述\n\n(mock) 基于确认上下文：${excerpt}\n\n占位内容，供端到端测试使用。`,
      },
      {
        gdd_section: 2,
        title: "(mock) 核心循环",
        markdown: "## 2 核心循环\n\n(mock) 核心循环占位内容。",
      },
      {
        gdd_section: 5,
        title: "(mock) 关卡设计",
        markdown: "## 5 关卡设计\n\n(mock) 关卡设计占位内容。",
      },
    ],
  });
  return Promise.resolve(result);
}

export function mockReview(_call: Call): Promise<ReviewOutput> {
  const result = ReviewSchema.parse({
    issues: [],
    revised_sections: [],
  });
  return Promise.resolve(result);
}

export function mockValidate(_call: Call): Promise<ValidationReport> {
  const result = ValidationReportSchema.parse({
    overall_score: 4.6,
    verdict: "WARN",
    dimensions: [
      { name: "经济循环", score: 4 },
      { name: "战斗公式", score: 5 },
      { name: "成长曲线", score: 5 },
      { name: "边界条件", score: 4 },
      { name: "系统耦合", score: 5 },
    ],
    risks: [
      {
        severity: "高",
        title: "资源通胀风险",
        detail: "(mock) 金币产出无上限，长期运营可能导致经济膨胀，建议设置每日产出软上限或添加额外消耗口。",
      },
      {
        severity: "中",
        title: "成长曲线断层",
        detail: "(mock) 20-30 级区间经验需求曲线斜率骤升，玩家流失风险较高，建议平滑过渡。",
      },
      {
        severity: "低",
        title: "边界条件缺失",
        detail: "(mock) 伤害公式未处理防御力为 0 时的除零情况，建议添加 max(1, defense) 护栏。",
      },
    ],
    tuning: [
      "(mock) 将金币每日产出上限设为基础值的 3 倍，避免长期通胀。",
      "(mock) 20-30 级经验需求曲线改为二次方平滑过渡，减少玩家流失。",
    ],
  });
  return Promise.resolve(result);
}
