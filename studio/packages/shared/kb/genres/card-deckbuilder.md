---
id: card-deckbuilder
kind: genre
aliases: [卡牌, 卡牌构筑, 集换式卡牌, deckbuilder, ccg, tcg, 牌组构筑, 卡牌游戏, roguelike-deckbuilder, 构筑]
tags: [card, deckbuilder, ccg, synergy, turn-based, build]
---
# 卡牌 / 牌组构筑 (Card Game / Deckbuilder)

## 核心循环
用卡组对战/闯关 → 抽牌、打出卡牌、消耗资源（费用/法力）产生效果 → 战斗中临场决策 combo → 胜利后**获取新卡、移除弱卡来优化牌组（deckbuilding）**→ 用进化的牌组挑战更强对手。核心快感是**"构筑一套协同牌组并看它运转起来的引擎搭建感（engine building）+ 临场抽牌随机性带来的博弈"**。

## 关键子系统
- **卡牌系统**：每张卡的费用、效果、类型（攻击/技能/buff/召唤），是内容核心。卡间**协同（synergy / combo）**是灵魂——单卡平庸但组合质变。
- **资源/费用系统**：每回合可用资源（法力/能量）限制出牌，是节奏与平衡的根本约束。
- **牌组构筑 (deckbuilding)**：构筑模式分两派——① **CCG/TCG**（赛前组牌，卡池来自收集/抽卡，如炉石）；② **Roguelike Deckbuilder**（局内逐步加卡删卡，如杀戮尖塔）。
- **抽牌/牌库循环**：抽牌、弃牌、洗牌、牌库 thinning（删牌提纯）是引擎运转的脉络。
- **对战/敌人系统**：PvP（对人）或 PvE（对 boss，可读的敌人意图 intent）。
- **稀有度/收集**（CCG）或 **遗物/升级**（roguelike deckbuilder）。

## 经济/数值要点
- **费用曲线 (mana curve)**：卡组中不同费用卡的分布决定节奏，是构筑的基本数学。
- **卡牌强度 = 费用效率（费效比）**：一张卡的效果价值需与费用匹配，过强的低费卡 break 平衡。
- **协同的乘法效应**易失控——combo 链能无限循环或一回合斩杀，需设防（费用门槛、有限抽牌、生命上限）。
- Roguelike deckbuilder 的张力：**加卡稀释 vs 提纯**——卡越多抽到关键卡概率越低，"少而精"是核心策略，删卡是重要资源。
- CCG 经济模式（抽卡氪金）vs 单机买断（Slay the Spire），决定数值松紧与付费设计。

## 经典参考作品
- **Slay the Spire**：Roguelike deckbuilder 奠基者，敌人意图透明 + 遗物协同 + 牌组提纯，构筑深度教科书，小团队杰作。
- **Hearthstone（炉石）**：CCG 大众化标杆，费用水晶递增 + 随从战场 + 职业卡，简化 MTG 降低门槛。
- **Magic: The Gathering（万智牌）**：TCG 始祖，定义费用/卡类型/堆栈结算，深度天花板。
- **Inscryption**：把 deckbuilder 与叙事/解谜/恐怖融合，机制随章节变形，创新典范。
- **Monster Train / Across the Obelisk**：多层防守 + 职业组合的 roguelike deckbuilder 变体。
- **Marvel SNAP**：极简化 CCG（6 回合、地点机制），手机端节奏革新。

## 常见坑
- **存在统治牌组（dominant deck / OP combo）**：某套组合碾压一切，元游戏坍缩，多样性死亡。
- 卡池/构筑空间不足，每局牌组雷同（roguelike deckbuilder 致命伤）。
- 抽牌随机性挫败：关键卡抽不到导致"非战之罪"的失败，需牌库 thinning/检索手段缓解。
- 新手看不懂卡牌交互与 combo（信息密度高），上手门槛陡。
- CCG 的付费墙/power creep（新卡越来越强逼氪）破坏长期生态。

## 单人/小团队可行性
**高（尤其 Roguelike Deckbuilder），是 solo 友好品类**。纯逻辑驱动、回合制、无实时同步、美术可 2D 卡面、技术门槛低。Slay the Spire / Inscryption 均小团队/个人作品。**核心成本是卡牌设计与协同平衡，而非美术或技术**——重玩性来自卡的组合空间而非数量。小团队建议：① 走 **PvE Roguelike Deckbuilder**（避开 CCG 的抽卡经济、PvP 平衡、实时联机三座大山）；② 设计**深度协同的中等卡池**（~75-150 张能两两生火的卡 > 海量孤立卡）；③ 敌人意图透明化（玩家能规划）是好体验关键。避免做实时 PvP CCG（平衡 + 联机 + 付费生态 = 重负担）。
