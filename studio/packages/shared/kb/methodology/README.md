# 方法论知识库（methodology KB）

通用游戏设计方法论卡片，由 harness 在 11 节点工作流的对应节点**按需注入** Claude 上下文，让每个节点的提问/选项/检查点"逻辑自洽"。每张卡 frontmatter 的 `applies_to_nodes` 声明它服务于哪些节点。

> 方法论卡片库，以《典藏图书馆》作为贯通示例，展示各卡在实际项目中的应用。

## 卡片 → 节点映射

| 卡片 | 主题 | applies_to_nodes | GDD 章节对应 |
|---|---|---|---|
| `core-loop.md` | 微/中/宏循环、核心动词、正反馈链 | `core_loop` | 核心循环 |
| `design-pillars.md` | Must-Have 支柱 / Won't-Do 反支柱 / 优先级 | `design_pillars` | 设计支柱与反支柱 |
| `core-fantasy.md` | 玩家幻想 / 目标用户画像 / 情感目标 | `core_fantasy` | 核心幻想 |
| `mda-framework.md` | MDA（机制-动态-美学）透镜 | `core_fantasy`, `design_pillars` | （透镜，无独立章节） |
| `genre-positioning.md` | 一句话定位 / 竞品对标 / 差异化锚点 / Scope S·M·L | `genre_scope` | 品类定位与竞品 |
| `resource-economy.md` | 源汇关系 / 资源节点 / 产消节奏 / 闭环验证 | `systems_resources` | 资源经济 |
| `systems-prioritization.md` | P0/P1/P2 系统分级 / MVP 闭合 | `systems_resources` | 系统设计 |
| `numeric-skeleton.md` | 公式方向(乘法+衰减) / Tier / 成长曲线 / 经济模型 / 离线公式 | `numeric_skeleton` | 数值框架 |
| `references-benchmarking.md` | 参考游戏当"设计标尺"，非抄袭 | `genre_scope`, `creative_intake` | 竞品对标 |
| `scope-discipline.md` | 砍社交/竞技/重进度，"首版不做" | `genre_scope`, `systems_resources` | 反支柱 / 首版不做 |
| `risk-and-validation.md` | 已知风险 / 待验证假设 / 验收指标 / 模拟 | `gate_review`, `simulate_verify` | 风险与待定 |

## 按节点反查（harness 注入清单）

进入某节点时，harness 应注入下列方法论卡 + 该节点的 `nodes/<node>` 说明书 + 当前已确认品类的 `genres/*`：

| seq | node_id | 注入的方法论卡 |
|---|---|---|
| 1 | `creative_intake` | `references-benchmarking` |
| 2 | `core_fantasy` | `core-fantasy`, `mda-framework` |
| 3 | `design_pillars` | `design-pillars`, `mda-framework` |
| 4 | `genre_scope` | `genre-positioning`, `references-benchmarking`, `scope-discipline` |
| 5 | `core_loop` | `core-loop` |
| 6 | `systems_resources` | `systems-prioritization`, `resource-economy`, `scope-discipline` |
| 7 | `numeric_skeleton` | `numeric-skeleton` |
| 8 | `gdd_packaging` | （汇总产出，复用上游已注入卡） |
| 9 | `gate_review` | `risk-and-validation` |
| 10 | `lock_dispatch` | `numeric-skeleton`（数值深写复用） |
| 11 | `simulate_verify` | `risk-and-validation` |

## 卡片结构约定

每张卡 frontmatter：`id` / `kind: methodology` / `applies_to_nodes` / `tags`。正文三段：
- **核心概念** — 方法论本身（含范式说明与参数区间参考）。
- **在问答中如何用** — harness 在对应节点生成 question/选项/检查点时的**具体**用法 + 收敛判据。
- **反模式/坑** — 该主题最常见的设计错误，供 harness 做轻量一致性校验。

## 可进化

知识库为纯 markdown 文件。新增方法论卡时：建 `<id>.md`、填三段结构与 frontmatter、在本 README 的两张表里登记节点映射即可被 harness 加载。
