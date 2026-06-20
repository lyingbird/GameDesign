# GameDesign Studio — AI 游戏设计文档生成工具

一个**全栈、开箱即用的 AI 游戏设计辅助工具**：输入一句话游戏想法，AI 通过 **11 节点人机协同工作流**逐步澄清设计意图，最终产出完整游戏设计文档（GDD）策划案。自带 API Key 即可独立运行，无需任何外部服务。

## 特性

- **11 节点协同工作流**：创意接入 → 核心幻想 → 设计支柱 → 品类定位 → 核心循环 → 系统模块 → 数值骨架 → GDD 装箱 → 门禁审核 → 锁版深写 → 模拟验证
- **品类知识库**：内置 20 个游戏品类卡（核心循环/子系统/参考作品/常见坑/单人可行性分析），AI 问答自动匹配注入
- **三种工作模式**：AI 游戏生成（WebSocket 11 节点）、数值验证（一次性评分）、剧情审核（SSE 流式输出）
- **Mock 模式**：无需 API Key 即可跑通全部流程，适合本地开发和演示
- **pnpm monorepo**：packages/shared + apps/server + apps/web，类型共享，零重复

## 快速开始

```bash
pnpm install

# Mock 模式（无需 API Key，适合开发调试）
GDF_MOCK=1 pnpm dev

# 使用真实模型
ANTHROPIC_API_KEY=sk-ant-... pnpm dev
# 或在页面设置界面填入 Key（仅存本浏览器，不落库）
```

启动后：
- Web 界面：http://localhost:5273
- Server API：http://localhost:8787

默认模型 `claude-opus-4-8`，可在设置界面切换（如 `claude-sonnet-4-6`）。

## 测试

```bash
pnpm test          # 运行全部测试（23 个）
pnpm -r typecheck  # 全部包类型检查
```

## 架构（monorepo）

```
packages/shared/        帧协议/REST 类型、11 节点注册表、结构化输出 schema、KB 加载器
  src/
    frames.ts           WebSocket 帧类型 + REST Envelope 定义
    nodes.ts            11 节点注册表 + 4 阶段分组
  kb/                   知识库（驱动 AI 问答逻辑自洽）
    nodes/              11 个节点说明书（目标/提问顺序/收敛判据/局部回炉规则）
    methodology/        设计方法论卡（核心循环/支柱/经济/数值骨架…），按节点注入
    genres/             20 个品类卡（核心循环/子系统/参考作品/坑/单人可行性）
    gdd-schema/         最终 GDD 章节骨架 + 装配说明
    skills/             扩展技能卡（如剧情审核）

apps/server/            Fastify(REST) + WebSocket 后端 + 11 节点工作流引擎 + Claude 接入
apps/web/               React + TDesign 前端 SPA
```

### 包名

所有内部包使用 `@gdf/*` 命名空间（如 `@gdf/shared`）。

### 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API Key | — |
| `GDF_MOCK` | 设为 `1` 启用 Mock 模式，跳过真实 API 调用 | `0` |
| `GDF_DATA_DIR` | 任务/会话数据存储目录 | `./data` |
| `GDF_MAX_TASKS` | 每用户最大并发任务数 | `2` |
| `PORT` | Server 监听端口 | `8787` |

## 工作模式

| 模式 | 入口 | 后端实现 |
|---|---|---|
| **AI 游戏生成** | 顶栏「AI 游戏生成」对话框 | WebSocket `/api/v2/ws`，11 节点人机协同 → GDD |
| **数值验证** | 顶栏「数值验证」上传 .md/.txt | WebSocket `command=simulate_verify`，一次性 → 评分报告 |
| **剧情审核** | 顶栏「剧情审核」上传剧情文本 | SSE `/api/chat`，剧情审核 Agent 流式输出 |

前端将 11 节点按 **4 阶段**（灵感共创 / 方案定型 / 专业深化 / 审核锁定）分组展示，右侧**产物工作台**在每个检查点沉淀一份可复制/下载的 Markdown 产物。

## 核心设计

- **WebSocket 帧协议**：`create_task` / `subscribe_task` / `query_task` / `answer` / `checkpoint_decision` / `ping`，配套 `req_id` / `ack_of` 确认机制，`connected` / `question` / `checkpoint` / `final` / `error` / `pong` 服务端帧；20 秒心跳保活。
- **11 节点状态机**：节点 1–7 交互问答（带推荐+论证的多选 + `option_id:0` 自定义自由文本），节点 8–11 自动生成 → 审核 → 锁版 → 模拟验证 → `final`。
- **人机协同细节**：自定义自由文本作为强约束驱动后续节点；检查点支持"按维度局部回炉"，保留已确认项；问题 600 秒无响应触发 `IDLE_TIMEOUT_CANCELLED`；断线后通过 `query_task` 的 `pending_question` / `pending_checkpoint` 字段恢复现场。
- **Context Harness**：进入节点时编排「节点说明书 + 相关方法论卡 + 匹配品类卡 + 已确认设计上下文」组成 Claude 系统提示，稳定 KB 前缀利用 Prompt Cache 降低 Token 消耗。
