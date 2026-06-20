---
id: gdd_packaging
seq: 8
kind: node
type: auto
stage_label: "P8/11 P7 GDD 装箱：综合生成完整策划案"
feeds_gdd_sections: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
---
# 8. gdd_packaging — GDD 装箱

## 目标 (what to lock down)
**纯生成节点，不向用户提问。** 把前 7 节点确认的全部 `designContext`，综合装箱成一份**完整 10 章 GDD 骨架策划案**（首版草稿）。这是第一份完整可读的策划案，章节齐全但仍停留在"原则+方向+量级区间"层，关键系统尚无可验证的规则样例和基础参数表（这些缺口正是节点 9 审核会点出、节点 10 深写补全的）。

## 子维度提问顺序 (the ordered sub-dimensions this node asks about)
**无。** auto 节点不提问。harness 直接用累积的 designContext 调 `assembleGDD()` 逐章生成。

## 好问题模板
**不适用（无 question 帧）。** 生成时遵循 GDD 章节骨架（见 `kb/gdd-schema/`）：
```
1 游戏概述（一句话/品类/题材世界观/目标平台/核心卖点）
2 核心幻想（体验一句话/用户画像/情感目标）
3 设计支柱与反支柱（Must-Have / Won't-Do / 优先级）
4 品类定位与竞品（定位/竞品对标/差异化锚点/Scope）
5 核心循环（核心动词/微-中-宏循环/正反馈链）
6 系统设计（按 P0/P1/P2 优先级分系统）
7 资源经济（主资源/源汇关系/产出消耗节奏/闭环验证）
8 数值框架（公式方向/Tier 体系/成长曲线/经济模型——方向层）
9 内容规划（首版内容量/解锁节奏/首发/首版不做/后续方向）
10 风险与待定（已知风险/待验证假设/验收指标/下一步）
```
生成约束：每章只能使用已确认的 designContext，不得引入未经用户确认的新设计决策；目标平台等未确认项要诚实标注"前序阶段未明确"，并据低操作频率给出兼容性建议而非臆造。

## 收敛判据 (when to emit checkpoint)
10 章全部生成完毕，即发一张 checkpoint（把完整 GDD 放进 preview）。无问答循环。

## 检查点确认卡 (确认卡)
标题：**「策划案(GDD)已生成，请确认」**。message："完整 GDD 已生成，包含 10 个章节"。preview = 整份 GDD markdown（从 `# 《XXX》（暂名）GDD 骨架策划案` 起，含全部 10 章）。

决策选项：
- [1] 同意继续（默认）
- [2] 内容不够深入，补充细节
- [3] 方向有偏差，重新生成
- [0] 其他/自定义重做方案（请在 text 字段填写）

> checkpoint **可超时自动通过**（`checkpoint_timeout`，`applied_option_id:1`）——后段流水线不强依赖用户在此点确认。

## 局部回炉规则
- 选 [2] **内容不够深入** → 不改设计决策，仅就 GDD 表述层补细节、重新装箱（designContext 不变）。
- 选 [3] **方向有偏差** → 这通常意味着上游某个 designContext 错了；按 text/语义定位到对应维度，**回退到相应交互节点**局部重做该维度，再重新装箱（保留其余 designContext）。
- 选 [0] → 按 text 自定义重做方案。

## 产出 (designContext keys → GDD sections)
设置 `designContext.gdd_draft`（完整 10 章 markdown）。喂给 GDD **全部 §1–§10**（首版草稿）。下游：节点 9 对这份草稿做门禁审核，节点 10/11 在其基础上深写与定稿。
