---
id: gate_review
seq: 9
kind: node
type: auto
stage_label: "P9/11 P8 门禁审核：审核+修订"
feeds_gdd_sections: [10]
---
# 9. gate_review — 门禁审核

## 目标 (what to lock down)
**纯生成节点，不向用户提问。** 以独立审核者视角，对节点 8 装箱出的 GDD 草稿做一次**结构化门禁审核**：给出 verdict、各维度评分、逐项修订建议，判断它能否进入正式制作/数值深写阶段。这是质量闸门——产出会喂给 GDD §10（风险与待定）的"已知风险/待验证假设/验收口径"。

## 子维度提问顺序 (the ordered sub-dimensions this node asks about)
**无。** auto 节点不提问。harness 用 designContext + gdd_draft 调 `review()` 生成审核报告。

## 好问题模板
**不适用（无 question 帧）。** 审核报告固定结构：
1. **verdict**：`PASS` / `NEEDS_REVISION` / `REJECT`（典型样例 = `NEEDS_REVISION`，并明确"不是方向性错误，不需要推翻"，"做一次中等强度修订即可"）。
2. **各维度评分**（JSON + 表格说明），四维 + 综合：
   ```json
   {"完整性": 8.5, "一致性": 9.0, "可落地性": 7.0, "风险项": 8.0, "综合评分": 8.1}
   ```
   - 完整性：章节是否齐全、是否有实质内容。
   - 一致性：是否与设计支柱、系统闭环、资源流对齐，是否违背反支柱。
   - 可落地性：是否有可制作的样例表/参数（典型低分项：缺任务产出表、馆区成本表、禁书规则表、书灵配置规则）。
   - 风险项：风险是否识别充分、是否有控制手段与监控指标。
3. **修订建议清单**（典型 8 项）：逐条点名缺口（如"为每本核心禁书写明改写了哪条规则的样例""补馆区修复成本表""补离线结算上限的具体口径"），且明确"修订后可进入原型、数值表、Monte Carlo 模拟与 UI 信息架构阶段"。

审核约束：审核须**对照设计支柱与反支柱**判一致性；评分要有依据（每个维度给一句评语）；修订建议必须可执行（指向具体缺的表/规则/口径），不能空泛。

## 收敛判据 (when to emit checkpoint)
审核报告（verdict + 评分 + 修订清单）生成完毕即发 checkpoint。无问答循环。

## 检查点确认卡 (确认卡)
标题：**「审核结论确认」**。message：如"审核结论：NEEDS_REVISION（8 项修订建议）"。preview = 完整审核报告 markdown（verdict / 各维度评分表 / 修订建议清单）。

决策选项：
- [1] 同意继续（默认）
- [2] 不接受，要求重新审核
- [3] 回退到某个阶段重做
- [0] 其他/自定义重做方案（请在 text 字段填写）

> checkpoint **可超时自动通过**（`checkpoint_timeout`，`applied_option_id:1`）。`NEEDS_REVISION` 不阻断流程——它产出的是给下游深写的修订清单，而非硬性退回。

## 局部回炉规则
- 选 [2] **不接受，要求重新审核** → 仅重跑审核（designContext / gdd_draft 不变），重新给 verdict 与建议。
- 选 [3] **回退到某个阶段重做** → 按 text 指定的阶段，**回退到对应交互节点**局部重做该维度（保留其余 designContext），再重新装箱+审核。
- 选 [0] → 按 text 自定义。

## 产出 (designContext keys → GDD sections)
设置 `designContext.review`（verdict / 评分 / 修订清单）。修订清单是节点 10 lock_dispatch 深写的**待办输入**（要补的表/规则/口径）。审核识别的风险与待验证假设喂给 GDD **§10 风险与待定**（与 simulate_verify 共同贡献）。
