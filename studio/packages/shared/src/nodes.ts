// The 11-node create_full pipeline registry.
// Node KB content lives in kb/nodes/<seq>-<id>.md and is loaded by kb.ts.

export type NodeType = "interactive" | "auto";

export interface NodeDef {
  seq: number;
  id: string;
  /** 阶段名 shown in stage_label as "P{seq}/11 ...". */
  name: string;
  type: NodeType;
  /** GDD chapter numbers (see kb/gdd-schema) this node primarily feeds. */
  feedsGddSections: number[];
}

export const NODES: NodeDef[] = [
  { seq: 1, id: "creative_intake", name: "P0 创意接入：理解用户想法", type: "interactive", feedsGddSections: [1] },
  { seq: 2, id: "core_fantasy", name: "P1 核心幻想：玩家为什么想玩", type: "interactive", feedsGddSections: [2] },
  { seq: 3, id: "design_pillars", name: "P2 设计支柱：必须做/不做", type: "interactive", feedsGddSections: [3] },
  { seq: 4, id: "genre_scope", name: "P3 品类定位：像谁、做多大", type: "interactive", feedsGddSections: [4] },
  { seq: 5, id: "core_loop", name: "P4 核心循环：玩家反复做什么", type: "interactive", feedsGddSections: [5] },
  { seq: 6, id: "systems_resources", name: "P5 系统模块：哪些系统、资源流", type: "interactive", feedsGddSections: [6, 7] },
  { seq: 7, id: "numeric_skeleton", name: "P6 数值骨架：公式方向、经济模型", type: "interactive", feedsGddSections: [8] },
  { seq: 8, id: "gdd_packaging", name: "P7 GDD装箱：综合生成完整策划案", type: "auto", feedsGddSections: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { seq: 9, id: "gate_review", name: "P8 门禁审核：审核+修订", type: "auto", feedsGddSections: [10] },
  { seq: 10, id: "lock_dispatch", name: "P9 锁版+数值深写", type: "auto", feedsGddSections: [8, 9] },
  { seq: 11, id: "simulate_verify", name: "P10 模拟验证", type: "auto", feedsGddSections: [10] },
];

/** User-facing 4-phase grouping of the 11 nodes. */
export interface Phase { key: string; label: string; nodeSeqs: number[] }
export const PHASES: Phase[] = [
  { key: "ideation", label: "灵感共创", nodeSeqs: [1, 2] },
  { key: "shaping", label: "方案定型", nodeSeqs: [3, 4] },
  { key: "deepening", label: "专业深化", nodeSeqs: [5, 6, 7] },
  { key: "review", label: "审核锁定", nodeSeqs: [8, 9, 10, 11] },
];
export function phaseOf(nodeSeq: number): Phase | undefined {
  return PHASES.find((p) => p.nodeSeqs.includes(nodeSeq));
}

export const NODE_BY_ID: Record<string, NodeDef> = Object.fromEntries(NODES.map((n) => [n.id, n]));
export const NODE_BY_SEQ: Record<number, NodeDef> = Object.fromEntries(NODES.map((n) => [n.seq, n]));

export function nextNode(seq: number): NodeDef | undefined {
  return NODE_BY_SEQ[seq + 1];
}
export function stageLabel(n: NodeDef): string {
  return `P${n.seq}/11 ${n.name}`;
}
