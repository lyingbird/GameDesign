---
id: simulate_verify
seq: 11
kind: node
type: auto
stage_label: "P11/11 模拟验证 → final"
feeds_gdd_sections: [8, 10]
---
# 11. simulate_verify — 模拟验证

## 目标 (what to lock down)
**纯生成节点，不向用户提问；唯一发 `final` 帧的节点。** 用节点 10 深写的公式与参数，对数值骨架做一次**模拟验证**（Monte Carlo 式推演节点 7 标出的最高风险：叠乘爆炸、离线收益穿透等），把验证结论、监控指标与阈值、待验证假设、阶段验收口径回填进最终 GDD，并**装订定稿**整份策划案，作为 `final` 产物交付。

## 子维度提问顺序 (the ordered sub-dimensions this node asks about)
**无。** auto 节点不提问。harness 调 `simulate()` + `finalizeGDD()`，输出最终 GDD markdown。

## 好问题模板
**不适用（无 question 帧，也无 checkpoint）。** 验证产出回填到 GDD **§10 风险与待定**，固定结构（定稿标题 `# 《XXX》（暂名）GDD 骨架策划案 v0.2`）：
- **§10.1 已知风险**：逐条风险（叠乘爆炸 / 离线收益穿透 / 禁书质变不足 / 内容量膨胀 / UI 维护膨胀 / 资源失衡 / 单位弱存在），每条给**控制手段 + 监控指标表（指标 | 阈值）**。例：
  ```
  | 指标 | 阈值 |
  | 单 Tier 内最高收益 / 基准收益 | 不超过 5~8 倍 |
  | 离线效率上限 | 不超过 100% |
  | 纯倍率禁书数量 | 0 |
  ```
- **§10.2 待验证假设**（编号列表，如"玩家是否能在第一本禁书明确感受到规则改写"等十余条）。
- **§10.3 阶段体验验收指标**（指标 | 目标 表：首次研读 5 分钟内、第一本禁书 2~4 小时、第三馆层第 N 天…）。

验证约束：模拟必须聚焦节点 7 标出的**最高优先级风险**，并验证节点 10 设的边界（离线结算 8/12/16/24 小时上限、同类加成递减、禁书倍率边界）是否守得住；阈值要可监控、可验收。

## 收敛判据 (when to emit checkpoint)
**不发 checkpoint。** 模拟+定稿完成后直接发 `final` 帧：
```
type: final
payload: { command:"create_full", final_result:{ content:{ format:"markdown", text:<完整 GDD> } }, expected_input:"none" }
```
最终 GDD 含全部 10 章（§1 概述 … §10 风险与待定 + 末尾确认卡）。

## 检查点确认卡 (确认卡)
**无独立 checkpoint。** final 的 GDD 文末仍带一张「确认卡」段，作为交付收尾（总结全案+下一步建议），但本节点不再等待用户决策（`expected_input:"none"`，任务转 done）。

## 局部回炉规则
- 本节点交付即终态，无决策选项。若验证暴露数值不可行，应**回退到节点 10**（重写公式/参数）或节点 7（重定数值方向）局部重做，保留其余 designContext，再重跑模拟。
- 用户对最终产物的不满意，通过新一轮回炉（定位到对应交互节点维度）处理，而非在本节点内修改。

## 产出 (designContext keys → GDD sections)
设置 `designContext.simulation`（验证结论/监控阈值/验收口径）与 `designContext.final_gdd`（定稿全文）。喂给 GDD **§8 数值框架**（被模拟验证背书的参数）与 **§10 风险与待定**（已知风险+控制手段+监控阈值+待验证假设+阶段验收指标）。输出 = 任务最终 `final_result`。
