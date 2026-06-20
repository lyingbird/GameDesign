---
id: lock_dispatch
seq: 10
kind: node
type: auto
stage_label: "P10/11 P9 锁版+数值深写"
feeds_gdd_sections: [8, 9]
---
# 10. lock_dispatch — 锁版 + 数值深写

## 目标 (what to lock down)
**纯生成节点，不向用户提问。** 锁定设计方向后，把节点 7 定下的**数值方向**和节点 9 的**修订清单**，深写成一份**完整可制作的数值设计文档**：命名公式、默认参数、Tier 体系、基准表、成长曲线参数、经济模型配比。这是从"方向层"到"可落地配表层"的跨越，补齐审核点出的可落地性缺口。

## 子维度提问顺序 (the ordered sub-dimensions this node asks about)
**无。** auto 节点不提问。harness 用 designContext（含 numeric_skeleton + review 修订清单）调 `deepWriteNumbers()` 生成。

## 好问题模板
**不适用（无 question 帧）。** 数值文档固定结构：
- **设计基准声明**（如"首版 3 个 Tier、12 个馆区、8 本核心禁书、5 条技能线、4 装备部位、6 名书灵、4 个派遣槽"，并声明采用"分层乘法 + 同类递减 + 离线上限 + 禁书规则改写"）。
- **完整公式设计**（命名表达式，示例）：
  - `F01 同类加成边际衰减`：`EffAdd(x,k,cap)=min(x/(1+x×k), cap)`，默认 `k=0.5, cap=1.5`。
  - `F02 同类乘区倍率`：`MulAdd(x,k,cap)=1+EffAdd(x,k,cap)`（附算例）。
  - `F03 单次研读知识产出`：`KnowledgeReward = BaseKnowledge × AreaMul × SkillMul_Knowledge × EquipMul × …`。
- **配表**：Tier 产出跨度、馆区成本表、禁书规则表、技能/装备词条表、离线结算上限表等（即把节点 9 修订清单逐项落成表）。

深写约束：所有公式必须**与节点 7 选定的公式方向一致**（分层乘法→各系统分乘区；边际衰减→同类加成走 F01）；必须**实现节点 7 的边界约束**（同类收益递减、单次离线结算上限、禁书只改规则不给超大倍率）；必须**回填节点 9 修订清单**点名缺的每张表/每条规则。

## 收敛判据 (when to emit checkpoint)
数值文档（公式 + 参数 + 全部配表）生成完毕即发 checkpoint。无问答循环。

## 检查点确认卡 (确认卡)
标题：**「数值设计确认」**。message：如"数值深化已完成，含完整公式与配表"。preview = 完整数值设计文档 markdown（设计基准 / 公式 F01… / 各配表）。

决策选项：
- [1] 同意继续（默认）
- [2] 公式参数需要调整
- [3] 经济模型有问题，重新设计
- [0] 其他/自定义重做方案（请在 text 字段填写）

> checkpoint **可超时自动通过**（`checkpoint_timeout`，`applied_option_id:1`）。

## 局部回炉规则
- 选 [2] **公式参数需要调整** → 仅重写公式/参数层（保留设计基准与方向）。
- 选 [3] **经济模型有问题** → 回退到节点 7 的经济模型维度局部重做，再重深写（其余 designContext 保留）。
- 选 [0] → 按 text 自定义调整。

## 产出 (designContext keys → GDD sections)
设置 `designContext.numbers`（完整公式+参数+配表）。深写结果喂给 GDD **§8 数值框架**（落成可制作配表层），并把首版内容规划细节回填 **§9 内容规划**（首版内容量/解锁节奏/首发/首版不做）。下游：节点 11 用这套数值跑模拟验证并定稿。
