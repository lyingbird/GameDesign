/**
 * gdd-schema.ts — structured model of the GDD output.
 *
 * This is an IMPLEMENTATION SKETCH, not production code. It mirrors the 10-chapter
 * template in schema.md and the reference GDD (《典藏图书馆》example).
 *
 * The `designContext` (built incrementally by nodes 1-7) is the source of truth;
 * nodes 8-11 render it into markdown (see assembly-notes.md). Wherever the GDD is
 * naturally tabular/formulaic, we model typed fields instead of opaque markdown so
 * that lock_dispatch (deepen numbers) and simulate_verify (validate) can operate on
 * data, not strings.
 */

// ---------- shared primitives ----------

/** A markdown table row keyed by column header -> cell text. Cells stay strings
 *  because GDD cells are often ranges ("8000~25,000") or qualitative ("宽松，频繁反馈"). */
export type TableRow = Record<string, string>;

export interface Table {
  /** Ordered column headers, e.g. ["任务","时长","知识碎片",...]. */
  columns: string[];
  rows: TableRow[];
  /** Column keys that should render right-aligned (numeric). */
  numericColumns?: string[];
}

/** A formula/pseudo-rule rendered inside a ```text``` fence. */
export interface Formula {
  name: string;
  /** The expression, e.g. "知识产出 = 基础产出 × 馆区倍率 × 技能倍率 × ...". */
  expr: string;
  /** Optional worked example or notes shown under the formula. */
  note?: string;
  /** Parameter ranges, e.g. {"馆区倍率":"1.00~3.00"}. */
  params?: Record<string, string>;
}

export interface Kpi {
  metric: string;   // 指标
  target: string;   // 目标 / 阈值
}

export type Priority = "P0" | "P1" | "P2";
export type RiskLevel = "🟢" | "🟡" | "🔴";

// ---------- ch.1 游戏概述 (creative_intake) ----------

export interface OverviewChapter {
  oneLiner: string;                       // 1.1
  genre: {                                // 1.2
    core: string;
    combo: string;
    experienceSources: string[];
    notCoreNote?: string;
  };
  theme: string;                          // 1.3 题材
  worldview: string;                      // 1.3 世界观（与机制挂钩）
  targetPlatform: {                       // 1.4
    assumption: string;
    derivedTraits: string[];
    sessionLength: string;
    mvpTechAssumptions: TableRow[];       // #### MVP 技术假设 表
  };
  sellingPoints: { title: string; detail: string }[]; // 1.5
}

// ---------- ch.2 核心幻想 (core_fantasy) ----------

export interface CoreFantasyChapter {
  playerExperienceOneLiner: string;       // 2.1
  targetAudience: {                       // 2.2
    type: string;
    traits: string[];
    coreFunNote: string;                  // "核心乐趣不是 X 而是 Y"
  };
  emotionalGoals: { title: string; detail: string }[]; // 2.3 (XX感)
}

// ---------- ch.3 设计支柱与反支柱 (design_pillars) ----------

export interface Pillar {
  name: string;
  intro?: string;
  /** bullets: 可改变的规则类型 / 设计要求 */
  points: string[];
}

export interface DesignPillarsChapter {
  pillars: Pillar[];                      // 3.1 Must-Have (3~4)
  antiPillars: { name: string; rationale: string }[]; // 3.2 Won't-Do
  /** 3.3 ordered priority chain, rendered as "A > B > C > D". */
  pillarPriority: string[];
  priorityExamples: string[];
}

// ---------- ch.4 品类定位与竞品 (genre_scope) ----------

export interface Competitor {
  name: string;
  role: "主对标" | "气质参考";
  learnings: string[];
  avoid: string;                          // "但本项目不做 X"
}

export interface GenreScopeChapter {
  positioningOneLiner: string;            // 4.1
  competitors: Competitor[];              // 4.2
  differentiationAnchor: {                // 4.3
    anchor: string;
    /** "原本 X → 现在 Y" 对比项 */
    rewrites: string[];
  };
  scope: {                                // 4.4
    sizeStatement: string;
    coreSystemCount: number;
    devMonths: string;                    // "9~15"
    coreSystems: string[];
    riskLevel: RiskLevel;
    riskNote: string;
  };
}

// ---------- ch.5 核心循环 (core_loop) ----------

export interface Loop {
  /** rendered bold, e.g. "选择书架任务 → 派遣书灵研读 → ..." */
  chain: string;
  description: string;
  examples?: string[];                    // 可见变化 / 典型目标
  kpis: Kpi[];                            // #### XX循环验收指标
}

export interface CoreLoopChapter {
  coreVerbs: { verb: string; detail: string }[]; // 5.1
  microLoop: Loop;                        // 5.2 分钟级
  midLoop: Loop;                          // 5.3 小时~天级
  macroLoop: Loop;                        // 5.4 周~月级
  positiveFeedbackChain: {                // 5.5
    chain: string;                        // bold closed loop
    steps: string[];                      // 7~8 步展开
  };
}

// ---------- ch.6 系统设计 (systems_resources; numbers deepened by lock_dispatch) ----------

export interface GameSystem {
  name: string;
  priority: Priority;
  goal: string;                           // #### 目标
  coreMechanics: string;                  // #### 核心机制 (prose)
  mechanicLists?: { title: string; items: string[] }[];
  /** mechanic-specific tables: 书灵规则/专长/任务类型/核心禁书样例/馆区规划/装备部位... */
  tables?: { title: string; table: Table }[];
  formulas?: Formula[];                   // incl. 离线 OnLogin 伪代码
  loopRelation: string;                   // #### 与主循环关系
  priorityNote: string;                   // #### 优先级 排期说明
}

export interface SystemsChapter {
  /** Sorted P0 first; real artifact had 6 systems. */
  systems: GameSystem[];
}

// ---------- ch.7 资源经济 (systems_resources; tempos deepened by lock_dispatch) ----------

export interface ResourceDef {
  name: string;
  role: string;                           // 定位
  sources: string[];                      // 产出来源
  sinks: string[];                        // 消耗去向
  requirements: string[];                 // 经济要求
}

export interface EconomyChapter {
  resources: ResourceDef[];               // 7.1 三主资源
  sourceSinkChain: {                      // 7.2
    chain: string;                        // bold closed loop
    sources: string[];
    sinks: string[];
  };
  baseTempoTable: Table;                  // 7.3 阶段 × 各资源
  keyTempo: { table: Table; benchmark: Table }; // 7.4 钥印产出节奏 + 基准产出
  inkCurve: { table: Table; dailyRef: Table };  // 7.5 灵墨消耗曲线 + 日消耗参考
  closureChecks: string[];                // 7.6 闭环验证 (~10 条)
}

// ---------- ch.8 数值框架 (numeric_skeleton; ALL tables/params filled by lock_dispatch) ----------

export interface Tier {
  name: string;                           // "Tier 1：尘封馆层"
  positioning: string;
  params: Record<string, string>;         // 馆区倍率/任务基础时长/知识产出倍率/...
}

export interface NumericChapter {
  formulaApproach: string;                // 8.1 e.g. "分层乘法 + 边际衰减"
  outputFormula: Formula;                 // 8.2 含 worked example
  durationFormula: Formula;               // 8.3 含下限
  offlineFormula: Formula;                // 8.4
  tiers: Tier[];                          // 8.5 (3 层)
  /** 8.6 per-Tier 任务基准 6列表 (deepened by lock_dispatch). */
  tierBenchmarkTables: { tier: string; table: Table }[];
  repairCost: { formula: Formula; tierRanges: Table; targetCostTable: Table }; // 8.7
  keyTempo: { table: Table; consumeRef: Table }; // 8.8
  inkBenchmark: Table;                    // 8.9 用途 × Tier 矩阵
  growthCurve: { approach: string; phases: { name: string; points: string[] }[] }; // 8.10
  economyModel: {                         // 8.11
    model: string;                        // bold
    resourceRoles: string[];
    topRisk: string;                      // "叠乘爆炸 + 离线收益穿透"
    simulationChecks: string[];           // fed to simulate_verify
  };
}

// ---------- ch.9 内容规划 (gdd_packaging + lock_dispatch) ----------

export interface UnlockPhase {
  name: string;                           // "第 1 阶段：入馆与基础研读"
  timeTarget: string;                     // "0~30 分钟"
  goals: string[];
  focus: string[];                        // 体验重点
  acceptance: string[];                   // 验收
}

export interface ContentChapter {
  scopeStrategy: string;                  // 9.1 bold "中等内容量 + 可复用任务池"
  scopeTable: { item: string; count: string }[]; // 9.1 内容量骨架
  unlockPhases: UnlockPhase[];            // 9.2 (5 阶段)
  launchVersion: { coreSystems: string[]; note: string }; // 9.3
  wontDoFirstVersion: { items: string[]; bufferNote: string }; // 9.4
  futureDirections: string[];             // 9.5
}

// ---------- ch.10 风险与待定 (gate_review + simulate_verify) ----------

export interface Risk {
  name: string;
  description: string;
  controls: string[];                     // 控制手段
  monitors: Kpi[];                        // 监控指标 (指标|阈值)
}

export interface RisksChapter {
  knownRisks: Risk[];                     // 10.1 (6~7 条) — gate_review finds, simulate_verify fills thresholds
  unvalidatedAssumptions: string[];       // 10.2 (~12 条)
  acceptanceKpis: Kpi[];                  // 10.3 汇总 KPI 总表
  openItems: string[];                    // 10.4 待补充
  nextStep: {                             // 10.5
    roadmap: string;                      // ```text``` chain
    priorityOrder: string[];
  };
}

// ---------- 确认卡 (simulate_verify, trailing, no chapter number) ----------

export interface ConfirmationCard {
  /** one line per chapter: "<章>: 已覆盖/已补充, <摘要>" */
  coverage: { chapter: string; summary: string }[];
  status: {
    version: string;                      // "v0.2"
    phase_complete: boolean;
    status: string;                       // "READY_FOR_PROTOTYPE_AND_NUMERIC_TABLES"
    summary: { dimension: string; value: string }[];
  };
}

// ---------- top-level document ----------

export interface GDD {
  /** 文档标题，格式如 "《游戏名》（暂名）GDD 骨架策划案 v0.2" */
  title: string;
  version: string;
  chapters: {
    overview: OverviewChapter;            // 1
    coreFantasy: CoreFantasyChapter;      // 2
    designPillars: DesignPillarsChapter;  // 3
    genreScope: GenreScopeChapter;        // 4
    coreLoop: CoreLoopChapter;            // 5
    systems: SystemsChapter;              // 6
    economy: EconomyChapter;              // 7
    numeric: NumericChapter;              // 8
    content: ContentChapter;              // 9
    risks: RisksChapter;                  // 10
  };
  confirmationCard: ConfirmationCard;
}

/**
 * `designContext` is the cumulative blackboard nodes 1-7 write into; it mirrors GDD
 * but is allowed to be partial during the run. Each key maps to one chapter above.
 * Nodes 8-11 read it to render markdown (see assembly-notes.md).
 */
export type DesignContext = Partial<{
  overview: Partial<OverviewChapter>;
  coreFantasy: Partial<CoreFantasyChapter>;
  designPillars: Partial<DesignPillarsChapter>;
  genreScope: Partial<GenreScopeChapter>;
  coreLoop: Partial<CoreLoopChapter>;
  systems: Partial<SystemsChapter>;
  economy: Partial<EconomyChapter>;
  numeric: Partial<NumericChapter>;
  content: Partial<ContentChapter>;
  risks: Partial<RisksChapter>;
}>;
