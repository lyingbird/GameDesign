# GameDesignFlow

> **AI 游戏设计工作室 · 以 Claude Code skill 形态本地运行**
> 一句话游戏想法 → 完整 GDD 策划案，外加数值审计与剧情审核。把一套成熟的 11 节点设计方法论，装进你的终端。

<p>
<img alt="Built for Claude Code" src="https://img.shields.io/badge/Built%20for-Claude%20Code-6E56CF">
<img alt="skills" src="https://img.shields.io/badge/skills-3-22C55E">
<img alt="genres" src="https://img.shields.io/badge/品类卡-21-F59E0B">
<img alt="methodology" src="https://img.shields.io/badge/节点方法论-11-3B82F6">
<img alt="tests" src="https://img.shields.io/badge/参考实现测试-23%20passing-22C55E">
<img alt="license" src="https://img.shields.io/badge/license-MIT-blue">
</p>

---

## 为什么有这个项目

做游戏立项，最痛的不是缺工具，而是**缺一个会逼你想清楚的结构**：核心幻想是什么？支柱砍掉了什么？资源闭不闭环？数值往哪个方向走？

市面上的 AI「一句话生成 GDD」要么**问你 18 轮问答**把你点烦，要么**一把梭直接吐一篇空话**。

GameDesignFlow 走第三条路：

> **AI 先按方法论起草，你批量圈改。** 方法论的严谨一条不丢，交互从 ~18 轮压成 **2 次审阅**。

它不是一个要你伺候的 Web 应用，而是几个**装在 Claude Code 里的 skill**——在你的终端、用你自己的对话，直接产出可交付的设计文档。

## 包含什么

三个独立、自包含的 Claude Code skill（`.claude/skills/`）：

| Skill | 干什么 | 交互 |
|---|---|---|
| **`gdd-architect`** | 一句话想法 → 完整 GDD 策划案（10 章） | 2 次批量审阅 → 自动装配 |
| **`numeric-audit`** | 数值/经济文档 → 五维审计评分报告（PASS/WARN/FAIL + 风险 + 调参） | 一次性 |
| **`narrative-review`** | 剧情/世界观文本 → 结构一致性审核报告 | 一次性 |

底层方法论知识库（`studio/packages/shared/kb/`，被 skill 按需读取增强）：
- **11 节点设计方法论**（创意接入 → 核心幻想 → 支柱 → 品类 → 循环 → 系统 → 数值 → 装配 → 审核 → 锁版 → 验证）
- **21 张品类卡**（塔防/肉鸽/ARPG/魂类/银河城/平台跳跃/卡牌…，含核心循环、子系统、参考作、坑、单人可行性）
- **11 张方法论卡** + **10 章 GDD 骨架 schema**

## 快速开始

```bash
# skill 已就位于 .claude/skills/，在本项目目录启动 Claude Code 即自动发现
cd GameDesign
```

在 Claude Code 对话里：

```
做个 GDD：我想做一个单人塔防 roguelite，塔击杀怪物后会进化变异
```
→ 触发 `gdd-architect`：匹配品类卡 → 出「方向卡」请你批量审阅 → 「蓝图卡」→ 装配完整 GDD 写入文件。

```
数值审计：<贴上你的资源产出消耗表>
剧情审核：<贴上你的剧情大纲>
```

**看一份真实产物** → [`.claude/skills/gdd-architect/EXAMPLE-GDD.md`](.claude/skills/gdd-architect/EXAMPLE-GDD.md)（由 skill 自测生成的《噬变防线》GDD）。

## 核心创新：2 次批量审阅

```
一句话想法
   │
   │  ① AI 读品类卡 + 方法论，主动【起草】4 个方向维度
   ▼
方向卡  ──►  你一次性回「继续」，或自然语言圈改（"支柱第2条换X、Scope缩到S"）
   │                          ▲
   │                          └─ 只重做被点名的维度，保留其余
   │  ② 基于确认方向，起草核心循环 / 系统 / 数值骨架
   ▼
蓝图卡  ──►  同样批量审阅
   │
   │  ③ 按 10 章 schema 自动装配
   ▼
完整 GDD.md（含风险章 + 自检清单）
```

对比逐题问答的旧体验：**~18 轮逐题点击 → 2 次批量审阅**。你随时能用自然语言强约束，AI 据此收敛——掌控感更强，来回更少。

## 目录结构

```
GameDesign/
├── .claude/skills/              ←  核心交付：三个 Claude Code skill
│   ├── gdd-architect/           ← 一句话 → GDD（含 EXAMPLE-GDD.md 示例产物）
│   ├── numeric-audit/           ← 数值审计
│   └── narrative-review/        ← 剧情审核
├── studio/                      ← 参考实现：可运行的全栈 Web 应用 + 知识库 + 23 测试
│   ├── packages/shared/kb/      ← 方法论知识库（skill 按需读取）
│   └── apps/{server,web}/       ← Fastify + ws 后端 + React 前端
├── README.md
└── LICENSE
```

## 参考实现：`studio`

skill 是「轻量本地」形态；`studio/` 则是一套**可运行的全栈 Web 应用**（React + TDesign 前端 / Fastify + WebSocket 后端 / 11 节点工作流引擎 / Claude 接入），作为方法论的「重型参考实现」与知识库的家。

```bash
cd studio && pnpm install
pnpm test            # 23 个测试（引擎/协议/存储/KB/装配）
GDF_MOCK=1 pnpm dev  # 无需 API key 跑通完整 11 节点 → Web :5273
```

> 日常用 **skill**（顺、轻）；想看完整原型或扩展引擎时用 **studio**。

## Roadmap / Known Issues

- [ ] skill 自包含分发：把所需 KB 卡片内联进各 skill，脱离 `studio/` 也能跑。
- [ ] `gdd-architect` 接 `numeric-audit`：GDD 第 8 章数值骨架自动送审。
- [ ] 更多品类卡（撤离射击 / 格斗 / 节奏 / 竞速）。
- [ ] 当前品类匹配靠别名/关键词；跨界融合（如「英雄 FPS」）需手动叠加多张卡。

## License

[MIT](LICENSE) © 2026
