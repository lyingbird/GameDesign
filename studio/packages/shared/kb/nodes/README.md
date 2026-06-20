---
kind: index
title: 11-Node Workflow Knowledge Base
---
# create_full 11 节点知识库索引

每个节点一份"节点说明书"，供 harness 在进入该节点时按需注入 Claude 上下文：
`nodes/<node> + 相关 methodology/* + 当前 designContext + 已确认品类对应 genres/*`。
目标是让 LLM 在只读「单个节点文件 + designContext」的情况下，产出**逻辑自洽**的下一个问题 / 选项 / 论证 / 检查点。

## 节点清单

| seq | 文件 | node_id | 阶段名 | type | stage_label |
|---|---|---|---|---|---|
| 1 | `01-creative_intake.md` | creative_intake | 创意接入 | interactive | P1/11 P0 创意接入：理解用户想法 |
| 2 | `02-core_fantasy.md` | core_fantasy | 核心幻想 | interactive | P2/11 P1 核心幻想：玩家为什么想玩 |
| 3 | `03-design_pillars.md` | design_pillars | 设计支柱 | interactive | P3/11 P2 设计支柱：必须做/不做 |
| 4 | `04-genre_scope.md` | genre_scope | 品类定位 | interactive | P4/11 P3 品类定位：像谁、做多大 |
| 5 | `05-core_loop.md` | core_loop | 核心循环 | interactive | P5/11 P4 核心循环：玩家反复做什么 |
| 6 | `06-systems_resources.md` | systems_resources | 系统模块 | interactive | P6/11 P5 系统模块：哪些系统、资源流 |
| 7 | `07-numeric_skeleton.md` | numeric_skeleton | 数值骨架 | interactive | P7/11 P6 数值骨架：公式方向、经济模型 |
| 8 | `08-gdd_packaging.md` | gdd_packaging | GDD 装箱 | auto | P8/11 P7 GDD 装箱：综合生成完整策划案 |
| 9 | `09-gate_review.md` | gate_review | 门禁审核 | auto | P9/11 P8 门禁审核：审核+修订 |
| 10 | `10-lock_dispatch.md` | lock_dispatch | 锁版+数值深写 | auto | P10/11 P9 锁版+数值深写 |
| 11 | `11-simulate_verify.md` | simulate_verify | 模拟验证 | auto | P11/11 模拟验证 → final |

## 全局机制（所有节点共享）

- **交互型（1–7）**：节点内按固定子维度顺序连续多问（每问一张选择题），全部答完才出该阶段的 markdown「确认卡」checkpoint。
- **自动型（8–11）**：不向用户提问，纯生成内容 → 发 checkpoint（可超时自动批准，`applied_option_id:1`）；节点 11 发 `final`（完整 GDD markdown）。
- **每个 question 必须**：① 一个「（推荐）」默认项 + 一段论证（先"我建议选 X"，再逐条说明为什么 X 优于其它，并**引用此前已确认的 designContext**：题材/支柱/目标玩家/单人团队约束等）；② 3–4 个互斥具体选项；③ `option_id:0` 恒为"其他/自定义（请在 text 字段填写自由描述）"。
- **自定义自由文本（option_id:0 + text）是一等驱动**：用户填的自由描述必须当作**强约束**注入后续所有节点上下文，不是兜底。（示例：填入"像 PVZ 但塔会击杀进化变异"后，全程围绕它收敛。）
- **检查点决策**：`option_id:1 = 同意继续`（默认）；其余选项 = 指定要重开的**某一个维度**（换品类/换题材/换核心体验/缩小 Scope/重做微循环…）。
- **局部回炉**：选非"继续"项时，**只重做被点名的那一个维度，保留其余已确认 designContext**，仅重问该维度一问再出新确认卡。回炉问题的论证须显式说明"我们只重做 X，先保留你已经定下来的 A/B/C"。
- **节点 4 的成本闸门**：genre_scope 末尾 checkpoint 标题为 **"⭐ 方向可继续确认（确认后进入重度阶段）"**——前 4 节点是轻量澄清，确认后才进入重度生成（系统/数值/装箱/审核/深写）。
- **超时**：question 600s 空闲 → `IDLE_TIMEOUT_CANCELLED`，整个任务 failed（不按默认推进）；checkpoint 超时 → 自动按默认项 `option_id:1` 通过（`*_timeout` 帧）。

## GDD 章节映射

```
1 游戏概述        ← creative_intake
2 核心幻想        ← core_fantasy
3 设计支柱与反支柱 ← design_pillars
4 品类定位与竞品   ← genre_scope
5 核心循环        ← core_loop
6 系统设计        ← systems_resources
7 资源经济        ← systems_resources
8 数值框架        ← numeric_skeleton (+ lock_dispatch 深写)
9 内容规划        ← gdd_packaging (+ lock_dispatch)
10 风险与待定      ← gate_review (+ simulate_verify)
```
