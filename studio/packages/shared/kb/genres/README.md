---
kind: genre-index
purpose: harness 用此索引把用户陈述的品类/关键词匹配到对应的 genre 卡片
match_strategy: 先精确匹配 id；再匹配 aliases（含中英文/俗称）；再做关键词包含匹配；命中多张时取最具体的一张并可叠加注入
---
# 品类知识库索引 (Genre KB Index)

本目录每个 `<id>.md` 是一张品类卡，供 AI 游戏设计工具的 11 节点工作流在涉及品类的节点（尤其 `genre_scope` P3、`core_loop` P4、`systems_resources` P5）按当前 `designContext` 已确认的品类**按需注入** Claude 上下文，让 AI 的提问/选项/参考作品做到品类准确。

## 匹配用法（harness）
1. 取用户在创意接入/品类定位阶段陈述的品类词、参考作品、核心机制描述。
2. 依次尝试：① 命中某卡 frontmatter 的 `id`；② 命中 `aliases`（中文名/英文/俗称）；③ 关键词/参考作品包含匹配（见下表"关键词"列）。
3. 命中即注入该卡全文（核心循环/子系统/数值/参考/坑/单团队可行性）。
4. 跨界融合品类（如"塔防+肉鸽""英雄FPS"）可同时注入多张卡（如 `tower-defense-roguelite` 已是融合卡；"英雄FPS"可叠 `fps` + `moba`）。

## 索引表

| genre id | 中文名 | aliases / 别名 | 关键词 & 参考作品（用于模糊匹配） |
|---|---|---|---|
| `tower-defense` | 塔防 | 塔防, td, tower defense, 守城, 防御, 防守 | 建塔, 波次, 防守路线, 迷宫塔防, Plants vs Zombies/植物大战僵尸, Bloons TD, Kingdom Rush, Defense Grid |
| `idle-incremental` | 挂机/增量 | 挂机, 放置, 增量, idle, incremental, clicker, 点击, 自走 | 离线收益, 转生, prestige, 数字增长, Cookie Clicker, AdVenture Capitalist, Melvor Idle, Antimatter Dimensions, Universal Paperclips |
| `roguelike-roguelite` | 肉鸽/类肉鸽 | 肉鸽, roguelike, roguelite, 随机地牢, 永久死亡, 局内构筑 | 每局随机, run, build, 协同, Hades, Binding of Isaac/以撒, Dead Cells/死亡细胞, Risk of Rain, Enter the Gungeon |
| `autobattler` | 自走棋 | 自走棋, 自动战斗, autobattler, auto chess, 自动棋 | 羁绊, 升星, 利息, reroll, Dota Auto Chess, TFT/云顶之弈, 炉石酒馆战棋, Super Auto Pets, Backpack Battles |
| `moba` | 多人在线战术竞技 | moba, 类dota, 类lol, 5v5, 推塔, 英雄对战 | 对线, 补刀, 打野, 团战, 大龙, LOL/英雄联盟, DOTA2, 王者荣耀, Heroes of the Storm, Deadlock |
| `fps` | 第一人称射击 | fps, 射击, 枪战, shooter, 第一人称, 突击射击 | 瞄准, 手感, gunplay, TTK, CS/CSGO, DOOM, Apex, Overwatch/守望先锋, Valorant, Half-Life |
| `battle-royale` | 大逃杀 | 大逃杀, 吃鸡, battle royale, br, 百人对战, 缩圈 | 跳伞, 搜刮, 毒圈, 决赛圈, PUBG/绝地求生, Fortnite/堡垒之夜, Apex, Warzone, Fall Guys |
| `arpg` | 动作RPG/刷宝 | arpg, 动作角色扮演, 刷宝, 暗黑类, 刷子, hack-and-slash, 砍杀 | 掉落, 词缀, build, loot, 割草, Diablo/暗黑破坏神, Path of Exile/流放之路, Grim Dawn, Last Epoch, Torchlight |
| `soulslike` | 魂类 | 魂类, soulslike, 类魂, 魂系, 类黑魂, 受苦, 高难度动作 | 耐力, 弹反, 篝火, boss, 死亡掉魂, Dark Souls/黑魂, Bloodborne/血源, Sekiro/只狼, Elden Ring/艾尔登法环, Hollow Knight, Lies of P |
| `metroidvania` | 银河城 | 银河城, metroidvania, 银河恶魔城, 类恶魔城, 能力门控, 探索解锁 | 二段跳, 回溯, backtracking, 互联地图, Metroid/银河战士, Castlevania/恶魔城, Hollow Knight/空洞骑士, Ori/奥日, Blasphemous, Super Metroid |
| `platformer` | 平台跳跃 | 平台跳跃, 平台游戏, 横版过关, 精准平台, platformer, platform game, 跳台 | 跳跃手感, 二段跳, 冲刺, coyote time, 即时重生, 关卡编排, 速通, Super Mario/马里奥, Celeste/蔚蓝, Super Meat Boy, N++, The End is Nigh |
| `rts` | 即时战略 | rts, 即时战略, 实时战略, 即时战术, real-time strategy | 采矿, 暴兵, 科技树, 微操, APM, StarCraft/星际争霸, Age of Empires/帝国时代, 红色警戒, Warcraft/魔兽争霸, Company of Heroes, They Are Billions |
| `turn-based-tactics` | 回合制战棋/战术 | 回合制战棋, 战棋, 策略战棋, turn-based tactics, srpg, tactics, 战术 | 网格, 行动点, 站位, 永久死亡, XCOM, Fire Emblem/火焰纹章, Into the Breach/陷阵之志, FF Tactics, Advance Wars, Wargroove |
| `card-deckbuilder` | 卡牌/牌组构筑 | 卡牌, 卡牌构筑, deckbuilder, ccg, tcg, 牌组构筑, 构筑 | 牌组, combo, 费用, 抽牌, 遗物, Slay the Spire/杀戮尖塔, 炉石传说/Hearthstone, 万智牌/MTG, Inscryption, Monster Train, Marvel SNAP |
| `tower-defense-roguelite` | 塔防肉鸽 | 塔防肉鸽, 肉鸽塔防, td roguelite, 随机塔防, 构筑塔防 | 塔防+肉鸽, 每关三选一, 随机词条塔, Isle of Arrows, Rogue Tower, (借鉴 Vampire Survivors 构筑滚雪球) |
| `simulation-management` | 模拟经营 | 模拟经营, 经营模拟, 管理模拟, simulation, management, tycoon, 大亨, 经营 | 供应链, 流程优化, 财务, 满意度, Factorio/异星工厂, RollerCoaster Tycoon/过山车大亨, Two Point Hospital, Stardew Valley/星露谷, RimWorld, Dwarf Fortress |
| `city-builder` | 城市建造 | 城市建造, 城建, city builder, 模拟城市, 城市模拟, 建设, 殖民地建造 | 区划, 道路, 拥堵, 供需, 人口, Cities Skylines/城市天际线, SimCity/模拟城市, Banished, Frostpunk/冰汽时代, Anno/纪元 |
| `survival` | 生存 | 生存, survival, 生存建造, 沙盒生存, 求生, 开放世界生存 | 采集, 制作, crafting, 庇护所, 饥饿口渴, Minecraft/我的世界, Don't Starve/饥荒, Subnautica/深海迷航, Valheim/英灵神殿, Rust, The Forest |
| `mmorpg` | 大型多人在线RPG | mmorpg, 网游, mmo, 多人在线rpg, 在线角色扮演 | 副本, 团本, 公会, 终局, 持久世界, WoW/魔兽世界, FF14/最终幻想14, RuneScape, Guild Wars 2, EVE Online, Lost Ark |
| `party-game` | 派对游戏 | 派对游戏, 聚会游戏, party game, 合家欢, 社交游戏, 小游戏合集 | 多人同屏, 小游戏, 橡皮筋翻盘, 社交博弈, Mario Party/马里奥派对, Jackbox, Overcooked/胡闹厨房, Fall Guys, Among Us, Gang Beasts |
| `puzzle` | 益智/解谜 | 益智, 解谜, 谜题, puzzle, 消除, 推理解谜, 逻辑 | 顿悟, aha, 核心机制变奏, 关卡教学, Tetris/俄罗斯方块, Portal/传送门, Baba Is You, The Witness, Candy Crush/糖果传奇, 推箱子 |

## 单人/小团队友好度速查（供 AI 推荐时参考）
AI 工具的用户多为单人/小团队策划，AI 应优先引导可控 scope。各品类对 solo 的友好度大致排序：

- **强烈推荐（低成本高新鲜度）**：`puzzle`, `idle-incremental`, `card-deckbuilder`, `tower-defense`, `tower-defense-roguelite`, `metroidvania`, `platformer`, `turn-based-tactics`
- **可行（需控 scope）**：`roguelike-roguelite`, `arpg`, `soulslike`(2D), `simulation-management`, `party-game`(本地同屏), `survival`(单人/小型), `autobattler`(PvE/异步), `city-builder`(小规模)
- **不推荐 / 高风险（联机+平衡+内容+玩家基数重负担）**：`moba`, `fps`(竞技多人), `battle-royale`, `rts`(竞技), `mmorpg`
  - 注：这些品类的**单人/PvE 变体**仍可行（如 PvE FPS / 单人 RTS 战役 / co-op RPG），AI 应据此引导用户缩小到可控子集，而非劝退。

> AI 每步应"带理由地收敛"——给推荐项 + 论证（针对单人开发的可控性、可验证性、美术产能等约束），而非单纯出选项。涉及上面"不推荐"品类时，应主动提示风险并给出务实的缩小方向。
