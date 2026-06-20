// Workflow engine: drives the 11-node create_full state machine, emitting frames
// through the Store and consuming answers / checkpoint decisions. See spec §3.2.
import {
  NODE_BY_SEQ, nextNode, stageLabel, CUSTOM_OPTION_ID, LIMITS,
  type NodeDef, type Option, type QuestionFrame, type CheckpointFrame,
  type FinalFrame, type ErrorFrame, type NextStep, type ValidationReport,
} from "@gdf/shared";
import { Store, newEventId, type TaskRec } from "./store.js";
import { buildNodeSystemPrompt, designContextSummary } from "./context.js";
import { makeClient, nextStep, generateSections, validateNumbers, DEFAULT_MODEL } from "./llm.js";
import { assembleFinal } from "./assemble.js";

const ts = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const expiry = () => new Date(Date.now() + LIMITS.IDLE_TIMEOUT_SEC * 1000).toISOString();

export class Engine {
  private timers = new Map<string, NodeJS.Timeout>(); // task_id -> idle timer

  constructor(private store: Store) {}

  private clientFor(task: TaskRec) {
    const s = this.store.getSession(task.session_id);
    const apiKey = s?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? (process.env.GDF_MOCK === "1" ? "mock" : null);
    if (!apiKey) throw new Error("NO_API_KEY");
    return { client: makeClient(apiKey), model: s?.model ?? DEFAULT_MODEL };
  }

  // ---------- lifecycle ----------
  async start(task: TaskRec) {
    if (task.command === "simulate_verify") {
      await this.runSimulateVerify(task);
      return;
    }
    await this.runNode(task);
  }

  // ---------- simulate_verify one-shot ----------
  private async runSimulateVerify(task: TaskRec) {
    const node = { id: "simulate_verify", seq: 11 };
    try {
      const { client, model } = this.clientFor(task);
      const locked_gdd = (task.designContext.locked_gdd as string | undefined) ?? "";
      const query = (task.designContext.query as string | undefined) ?? "";
      const system = `你是一位资深游戏数值策划，专精资源经济模型审计。
请对用户提供的数值设计文档进行全面审计，重点检查以下五个维度：
1. 经济循环（资源产出/消耗是否闭环，是否存在通胀/通缩风险）
2. 战斗公式（DPS/EHP/伤害区间是否合理，公式边界是否清晰）
3. 成长曲线（属性/等级/进度曲线是否平滑，有无断层或跳跃）
4. 边界条件（极端输入/最小值/最大值/负数/零值是否有护栏）
5. 系统耦合（多系统交叉时数值放大效应是否可控）

对每个维度给出 0-10 分评分，并给出综合评分（0-10）与判定（PASS/WARN/FAIL）。
列出所有风险项（高/中/低），并给出具体的调参建议。`;
      const user = locked_gdd
        ? `设计目标：${query}\n\n数值文档：\n${locked_gdd}`
        : `设计目标：${query}\n\n（未提供数值文档，请基于设计目标进行通用审计）`;
      const report: ValidationReport = await validateNumbers({ client, model, system, user });
      const text = renderValidationReport(report);
      task.final_text = text;
      const frame: FinalFrame = {
        type: "final", event_id: newEventId(), node_id: node.id, node_seq: node.seq,
        task_id: task.task_id, timestamp: ts(),
        payload: { command: "simulate_verify", final_result: { content: { format: "markdown", text } }, expected_input: "none" },
      };
      task.status = "done";
      task.finished_at = ts();
      this.store.persist(task); // durable before emit (crash-safety)
      this.store.emitFrame(task, frame);
    } catch (e) {
      const errNode: NodeDef = NODE_BY_SEQ[11] ?? { seq: 11, id: "simulate_verify", name: "P10 模拟验证", type: "auto", feedsGddSections: [10] };
      this.fail(task, errNode, "INTERNAL_ERROR", e instanceof Error ? e.message : String(e));
    }
  }

  private async runNode(task: TaskRec) {
    const node = NODE_BY_SEQ[task.current_node_seq];
    if (!node) return;
    task.current_node_id = node.id;
    try {
      if (node.type === "interactive") await this.stepInteractive(task, node);
      else await this.runAuto(task, node);
    } catch (e) {
      this.fail(task, node, e instanceof Error && e.message === "NO_API_KEY" ? "INTERNAL_ERROR" : "INTERNAL_ERROR",
        e instanceof Error ? e.message : String(e));
    }
  }

  // ---------- interactive nodes (1-7) ----------
  private async stepInteractive(task: TaskRec, node: NodeDef) {
    const { client, model } = this.clientFor(task);
    const system = buildNodeSystemPrompt(node, task.designContext);
    const user = this.buildUserTurn(task, node);
    const step: NextStep = await nextStep({ client, model, system, user });

    if (step.action === "ask") {
      const options = ensureCustom(step.options ?? []);
      const def = options.find((o) => o.option_id === step.recommended_option_id) ?? options[0];
      const frame: QuestionFrame = {
        type: "question", event_id: newEventId(), node_id: node.id, node_seq: node.seq,
        task_id: task.task_id, timestamp: ts(),
        payload: {
          clarify_id: "cl_" + rid(8), question: step.question ?? "", message: step.message ?? "",
          options, default_option: def, expected_input: "answer", expected_tool: "gdf_answer",
          node_id: node.id, node_index: node.seq - 1, node_name: node.name, node_seq: node.seq,
          stage_label: stageLabel(node), total_nodes: LIMITS.TOTAL_NODES,
          timeout_sec: LIMITS.IDLE_TIMEOUT_SEC, expires_at: expiry(),
          last_message: "等待用户回答：" + (step.question ?? ""),
        },
      };
      task.status = "waiting";
      task.pending = { kind: "question", id: frame.payload.clarify_id, node_seq: node.seq, frame, expires_at: Date.now() + LIMITS.IDLE_TIMEOUT_SEC * 1000 };
      this.store.emitFrame(task, frame);
      this.armIdle(task, node);
    } else {
      // finalize → checkpoint
      const cp = step.checkpoint!;
      const options = ensureCustom(cp.options ?? [{ option_id: 1, text: "同意继续" }]);
      const def = options.find((o) => o.option_id === cp.recommended_option_id) ?? options[0];
      (task.designContext as any)[`__staged_${node.id}`] = step.confirmed ?? {};
      const frame: CheckpointFrame = {
        type: "checkpoint", event_id: newEventId(), node_id: node.id, node_seq: node.seq,
        task_id: task.task_id, timestamp: ts(),
        payload: {
          checkpoint_id: "scp_" + rid(8), title: cp.title, message: cp.title,
          preview: { format: "markdown", text: cp.preview_markdown }, options, default_option: def,
          expected_input: "checkpoint_decision", expected_tool: "gdf_checkpoint_decision",
          stage: node.id, stage_label: stageLabel(node), node_id: node.id, node_index: node.seq - 1,
          node_name: node.name, node_seq: node.seq, total_nodes: LIMITS.TOTAL_NODES,
          timeout_sec: LIMITS.IDLE_TIMEOUT_SEC, expires_at: expiry(), last_message: "等待用户决策检查点：",
        },
      };
      task.status = "waiting";
      task.pending = { kind: "checkpoint", id: frame.payload.checkpoint_id, node_seq: node.seq, frame, expires_at: Date.now() + LIMITS.IDLE_TIMEOUT_SEC * 1000 };
      this.store.emitFrame(task, frame);
      this.armIdle(task, node);
    }
  }

  private buildUserTurn(task: TaskRec, node: NodeDef): string {
    const history = (task.designContext[`${node.id}_qa`] as { q: string; a: string }[] | undefined) ?? [];
    const redo = task.designContext[`${node.id}_redo`] as string | undefined;
    return [
      designContextSummary(task.designContext),
      history.length ? "\n本节点已问答：\n" + history.map((h, i) => `Q${i + 1}: ${h.q}\nA${i + 1}: ${h.a}`).join("\n") : "",
      redo ? `\n用户在检查点要求重做该维度：「${redo}」。只重做这个维度，保留其它已确认结论。` : "",
      "\n请输出下一步（继续提问 action:\"ask\"，或本节点维度已齐全则 action:\"finalize\" 给确认卡）。",
    ].filter(Boolean).join("\n");
  }

  // ---------- client events ----------
  async onAnswer(task: TaskRec, clarify_id: string, option_id: number, text: string) {
    const p = task.pending;
    if (!p || p.kind !== "question" || p.id !== clarify_id) return;
    const qf = p.frame as QuestionFrame;
    const chosen = option_id === CUSTOM_OPTION_ID ? text : (qf.payload.options.find((o) => o.option_id === option_id)?.text ?? text);
    const node = NODE_BY_SEQ[p.node_seq];
    const qa = (task.designContext[`${node.id}_qa`] as { q: string; a: string }[] | undefined) ?? [];
    qa.push({ q: qf.payload.question, a: chosen });
    task.designContext[`${node.id}_qa`] = qa;
    this.clearIdle(task);
    task.pending = null;
    task.status = "running";
    await this.stepInteractive(task, node);
  }

  async onDecision(task: TaskRec, checkpoint_id: string, option_id: number, text: string) {
    const p = task.pending;
    if (!p || p.kind !== "checkpoint" || p.id !== checkpoint_id) return;
    const node = NODE_BY_SEQ[p.node_seq];
    this.clearIdle(task);
    task.pending = null;
    task.status = "running";
    if (option_id === 1) {
      // 同意继续 → merge staged confirmations, clear node scratch, advance
      const staged = (task.designContext as any)[`__staged_${node.id}`] ?? {};
      Object.assign(task.designContext, staged);
      delete (task.designContext as any)[`__staged_${node.id}`];
      delete (task.designContext as any)[`${node.id}_redo`];
      const nxt = nextNode(node.seq);
      if (!nxt) return;
      task.current_node_seq = nxt.seq;
      await this.runNode(task);
    } else {
      // 换某维度 → partial redo of this node, preserving the rest
      const cpf = p.frame as CheckpointFrame;
      const optText = option_id === CUSTOM_OPTION_ID ? text : (cpf.payload.options.find((o) => o.option_id === option_id)?.text ?? text);
      (task.designContext as any)[`${node.id}_redo`] = optText;
      await this.stepInteractive(task, node);
    }
  }

  // ---------- auto nodes (8-11) ----------
  private async runAuto(task: TaskRec, node: NodeDef) {
    const { client, model } = this.clientFor(task);
    const sections = (task.designContext.sections as any[] | undefined) ?? [];
    if (node.id === "gdd_packaging") {
      const out = await generateSections({ client, model, system: buildNodeSystemPrompt(node, task.designContext),
        user: designContextSummary(task.designContext) + "\n\n请基于以上已确认上下文，生成 GDD 第 1–9 章的 markdown 草稿（按 gdd-schema）。" });
      task.designContext.sections = out.sections;
    } else if (node.id === "gate_review") {
      const out = await generateSections({ client, model, system: buildNodeSystemPrompt(node, task.designContext),
        user: sectionsDump(sections) + "\n\n审核以上草稿（完整性/支柱一致性/资源闭环），并生成第 10 章「风险与待定」。返回需要补充或修订的章节。" });
      task.designContext.sections = mergeSections(sections, out.sections);
    } else if (node.id === "lock_dispatch") {
      const out = await generateSections({ client, model, system: buildNodeSystemPrompt(node, task.designContext),
        user: sectionsDump(sections) + "\n\n锁版并深化数值：把第 8 章数值框架与第 9 章内容规划中的区间/占位写成具体的公式与基准表。返回修订后的对应章节。" });
      task.designContext.sections = mergeSections(sections, out.sections);
    }
    if (node.id === "simulate_verify") {
      const text = assembleFinal(task.designContext);
      task.final_text = text;
      const frame: FinalFrame = {
        type: "final", event_id: newEventId(), node_id: node.id, node_seq: node.seq, task_id: task.task_id, timestamp: ts(),
        payload: { command: "create_full", final_result: { content: { format: "markdown", text } }, expected_input: "none" },
      };
      task.status = "done";
      task.finished_at = ts();
      this.store.emitFrame(task, frame);
      return;
    }
    const nxt = nextNode(node.seq);
    if (nxt) { task.current_node_seq = nxt.seq; await this.runNode(task); }
  }

  // ---------- idle timeout ----------
  private armIdle(task: TaskRec, node: NodeDef) {
    this.clearIdle(task);
    const h = setTimeout(() => {
      if (!task.pending) return;
      this.fail(task, node, "IDLE_TIMEOUT_CANCELLED", "用户长时间无响应，任务已自动取消");
    }, LIMITS.IDLE_TIMEOUT_SEC * 1000);
    this.timers.set(task.task_id, h);
  }
  private clearIdle(task: TaskRec) {
    const h = this.timers.get(task.task_id);
    if (h) { clearTimeout(h); this.timers.delete(task.task_id); }
  }
  private fail(task: TaskRec, node: NodeDef, code: ErrorFrame["payload"]["code"], message: string) {
    this.clearIdle(task);
    task.pending = null;
    task.status = "failed";
    task.finished_at = ts();
    const frame: ErrorFrame = {
      type: "error", event_id: newEventId(), node_id: node.id, node_seq: node.seq, task_id: task.task_id, timestamp: ts(),
      payload: { code, message: `[${code}] ${message}`, status: "failed", expected_input: "none" },
    };
    this.store.emitFrame(task, frame);
  }
}

function renderValidationReport(r: ValidationReport): string {
  const lines: string[] = [
    `综合评分: ${r.overall_score}/10`,
    `判定: ${r.verdict}`,
    "",
    "## 各维度评分",
    ...r.dimensions.map((d) => `- ${d.name}: ${d.score}/10`),
    "",
    "## 风险项",
    ...r.risks.map((risk) => `- [${risk.severity}] **${risk.title}**\n  ${risk.detail}`),
    "",
    "## 调参建议",
    ...r.tuning.map((t) => `- ${t}`),
  ];
  return lines.join("\n");
}

function ensureCustom(options: Option[]): Option[] {
  if (!options.some((o) => o.option_id === CUSTOM_OPTION_ID)) {
    options = [...options, { option_id: CUSTOM_OPTION_ID, text: "其他/自定义（请在 text 字段填写自由描述）" }];
  }
  return options;
}
function sectionsDump(sections: any[]): string {
  return sections.map((s) => `## ${s.gdd_section} ${s.title}\n${s.markdown}`).join("\n\n");
}
function mergeSections(base: any[], updates: any[]): any[] {
  const map = new Map(base.map((s) => [s.gdd_section, s]));
  for (const u of updates) map.set(u.gdd_section, { gdd_section: u.gdd_section, title: u.title ?? map.get(u.gdd_section)?.title ?? "", markdown: u.markdown });
  return [...map.values()].sort((a, b) => a.gdd_section - b.gdd_section);
}
function rid(n: number): string { let s = ""; while (s.length < n) s += Math.random().toString(16).slice(2); return s.slice(0, n); }
