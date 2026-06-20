// Story-review SSE endpoint (mode 5 / workflow_id:"chat_story_review").
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL } from "./llm.js";

// ---------------------------------------------------------------------------
// SKILL.md loader
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
// Resolved from apps/server/src/ → up 3 levels to repo root → packages/shared/kb/…
const SKILL_PATH = join(
  HERE,
  "..",
  "..",
  "..",
  "packages",
  "shared",
  "kb",
  "skills",
  "narrative-review",
  "SKILL.md",
);

function loadSkill(): string {
  try {
    return readFileSync(SKILL_PATH, "utf8");
  } catch {
    return "# 剧情审核技能\n\n请审核用户提交的剧情文本，指出结构矛盾、角色动机断裂、叙事一致性问题、伏笔与回收及节奏问题，并给出修订建议。";
  }
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

type RawReply = import("node:http").ServerResponse;

function sseWrite(raw: RawReply, event: string, data: unknown): void {
  raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ---------------------------------------------------------------------------
// Mock stream
// ---------------------------------------------------------------------------

const MOCK_REVIEW = `## 综合判断

(mock) 剧情整体结构清晰，但存在若干角色动机断裂及伏笔未回收问题，需在修订中重点关注。

---

## 问题清单

### 结构问题

| 严重程度 | 定位 | 问题描述 | 修订建议 |
|---------|------|---------|---------|
| [中] | 第二章·转折点 | 主角从城市转移至荒野的原因交代模糊，因果链不完整 | 增加一段铺垫对话或环境描写，说明转移动机 |

### 角色问题

| 严重程度 | 定位 | 问题描述 | 修订建议 |
|---------|------|---------|---------|
| [高] | 反派·最终决战 | 反派突然放弃已胜局面，与其"不择手段"的人设矛盾 | 补充一个隐藏动机或外部干预事件作为解释 |

### 一致性问题

无发现问题

---

## 修订方向总结

★ 优先修复反派最终决战的动机断裂（角色一致性核心问题）
★ 补全第二章转折的因果逻辑链
- 梳理全文伏笔清单，确认每处伏笔均有回收安排
`;

async function runMockStream(raw: RawReply): Promise<void> {
  const chunkSize = 5;
  // Emit a synthetic tool_start event
  sseWrite(raw, "tool_start", {
    name: "read_file",
    run_id: randomUUID(),
    parent_ids: [],
    input: { file_path: "/workspace/skills/narrative-review-v1/SKILL.md", limit: 1000 },
  });

  await new Promise<void>((resolve) => setTimeout(resolve, 80));

  // Stream the mock review in small chunks
  for (let i = 0; i < MOCK_REVIEW.length; i += chunkSize) {
    const text = MOCK_REVIEW.slice(i, i + chunkSize);
    sseWrite(raw, "token", { text });
    await new Promise<void>((resolve) => setTimeout(resolve, 30));
  }
}

// ---------------------------------------------------------------------------
// Real Anthropic stream
// ---------------------------------------------------------------------------

async function runAnthropicStream(
  raw: RawReply,
  apiKey: string,
  systemPrompt: string,
  userContent: string,
): Promise<void> {
  const client = new Anthropic({ apiKey });

  // Emit a synthetic tool_start event
  sseWrite(raw, "tool_start", {
    name: "read_file",
    run_id: randomUUID(),
    parent_ids: [],
    input: { file_path: "/workspace/skills/narrative-review-v1/SKILL.md", limit: 1000 },
  });

  const stream = client.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  try {
    await new Promise<void>((resolve, reject) => {
      stream.on("text", (text) => {
        sseWrite(raw, "token", { text });
      });
      stream.on("error", reject);
      stream.on("finalMessage", () => resolve());
    });
  } finally {
    // Stop any further event emission (avoids dangling post-finalMessage errors).
    try { stream.abort(); } catch { /* ignore */ }
  }
}

/** Strip anything that could echo the API key (Anthropic errors include the key prefix). */
function safeErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "API key 无效或缺失";
  if (err instanceof Anthropic.APIError) return `模型服务错误 (${err.status ?? "?"})`;
  return "生成失败，请稍后重试";
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

interface SessionBody {
  workflow_id?: string;
}

interface StreamBody {
  session_id?: string;
  content?: string;
  message?: string;
  file_text?: string;
  goal?: string;
}

export function registerChat(app: FastifyInstance): void {
  // POST /api/chat/session
  // Returns a session + task id pair.
  app.post<{ Body: SessionBody }>("/api/chat/session", async (req) => {
    const workflow_id = String((req.body as SessionBody)?.workflow_id ?? "chat_story_review");
    return {
      status: 0,
      msg: "ok",
      data: {
        session_id: randomUUID(),
        task_id: randomUUID(),
        v: 1,
        workflow_id,
        workflow_name: workflow_id,
      },
    };
  });

  // GET /api/narrative/tasks
  // Narrative task list (currently always empty).
  app.get("/api/narrative/tasks", async () => ({
    status: 0,
    msg: "OK",
    data: [],
  }));

  // POST /api/chat/sessions/messages/stream
  // SSE streaming endpoint — drives the narrative-review agent.
  app.post<{ Body: StreamBody }>(
    "/api/chat/sessions/messages/stream",
    async (req, reply) => {
      const body = (req.body ?? {}) as StreamBody;
      const userText = body.content ?? body.message ?? "";
      const fileText = body.file_text ?? "";
      const goal = body.goal ?? "";

      // Compose the user content that the model will review
      const userContent = [
        fileText ? `## 剧情文本\n\n${fileText}` : "",
        goal ? `## 审核目标\n\n${goal}` : "",
        !fileText && !goal ? userText : "",
      ]
        .filter(Boolean)
        .join("\n\n")
        .trim() || userText;

      // Grab API key from header or env
      const apiKey = String(
        req.headers["x-anthropic-key"] ?? process.env.ANTHROPIC_API_KEY ?? "",
      );

      // Set SSE headers and hijack the raw socket
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.hijack();

      const raw = reply.raw;

      try {
        if (process.env.GDF_MOCK === "1") {
          await runMockStream(raw);
        } else if (!apiKey) {
          // No key available — fall back to mock so the endpoint never hard-errors
          await runMockStream(raw);
        } else {
          const systemPrompt = loadSkill();
          await runAnthropicStream(raw, apiKey, systemPrompt, userContent);
        }
      } catch (err) {
        sseWrite(raw, "error", { message: safeErrorMessage(err) });
      } finally {
        sseWrite(raw, "done", {});
        raw.end();
      }
    },
  );
}
