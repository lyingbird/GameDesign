// Zod schemas for Claude structured outputs that drive the workflow engine.
// Each interactive node calls the LLM with NextStep; auto nodes use Section/Final.
import { z } from "zod";

export const OptionSchema = z.object({
  option_id: z.number().int(),
  text: z.string(),
});

/**
 * One step of an interactive node. The LLM either asks the next clarifying
 * question, or signals the node is done and proposes a checkpoint card.
 * Mirrors the real tool: a recommended option (with reasoning in `message`)
 * + 3-4 options + an option_id:0 free-text choice.
 */
export const NextStepSchema = z.object({
  action: z.enum(["ask", "finalize"]),
  // when action === "ask"
  question: z.string().optional(),
  message: z.string().optional(), // markdown: recommendation + 论证 referencing confirmed context
  options: z.array(OptionSchema).optional(), // must include option_id 0 "其他/自定义"
  recommended_option_id: z.number().int().optional(),
  // when action === "finalize"
  checkpoint: z
    .object({
      title: z.string(),
      preview_markdown: z.string(), // the 确认卡
      options: z.array(OptionSchema), // 同意继续 + per-dimension 换X + 自定义
      recommended_option_id: z.number().int(),
    })
    .optional(),
  /** keys this step has confirmed into designContext (when finalizing). */
  confirmed: z.record(z.string(), z.unknown()).optional(),
});
export type NextStep = z.infer<typeof NextStepSchema>;

/** Output of an auto-generation node: one or more GDD section drafts (markdown). */
export const SectionSchema = z.object({
  sections: z.array(
    z.object({
      gdd_section: z.number().int(), // chapter number from kb/gdd-schema
      title: z.string(),
      markdown: z.string(),
    })
  ),
});
export type SectionOutput = z.infer<typeof SectionSchema>;

/**
 * Numeric-validation (simulate_verify) one-shot report.
 * Mirrors the real tool: 综合评分 + 判定 + 各维度评分 + 风险项 + 调参建议.
 */
export const ValidationReportSchema = z.object({
  overall_score: z.number(), // 0-10
  verdict: z.enum(["PASS", "WARN", "FAIL"]),
  dimensions: z.array(z.object({ name: z.string(), score: z.number() })), // 经济循环/战斗公式/成长曲线/边界条件/系统耦合
  risks: z.array(z.object({ severity: z.enum(["高", "中", "低"]), title: z.string(), detail: z.string() })),
  tuning: z.array(z.string()), // 调参建议
});
export type ValidationReport = z.infer<typeof ValidationReportSchema>;

/** Gate-review output: issues found + revised sections. */
export const ReviewSchema = z.object({
  issues: z.array(z.object({ section: z.number().int(), severity: z.enum(["low", "med", "high"]), note: z.string() })),
  revised_sections: z.array(z.object({ gdd_section: z.number().int(), markdown: z.string() })),
});
export type ReviewOutput = z.infer<typeof ReviewSchema>;
