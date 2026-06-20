// Browser client: REST + WebSocket, mirroring the real GameDesignFlow protocol.
const LS_KEY = "gdf_api_key";
const LS_MODEL = "gdf_model";

export const getKey = () => localStorage.getItem(LS_KEY) ?? "";
export const setKey = (k: string) => localStorage.setItem(LS_KEY, k);
export const getModel = () => localStorage.getItem(LS_MODEL) ?? "claude-opus-4-8";
export const setModel = (m: string) => localStorage.setItem(LS_MODEL, m);

const rid = (n = 12) => { let s = ""; while (s.length < n) s += Math.random().toString(16).slice(2); return s.slice(0, n); };
const headers = () => ({ "content-type": "application/json", "x-anthropic-key": getKey(), "x-gametalk-uid": "local" });

export async function getConfig() { return (await fetch("/api/config")).json().then((r) => r.data); }
export async function listTasks() {
  const r = await (await fetch("/api/v2/web/tasks?_t=" + Date.now(), { headers: headers() })).json();
  return r.data?.tasks ?? [];
}
async function createSession(): Promise<string> {
  const r = await (await fetch("/api/v2/web/session", { method: "POST", headers: headers(), body: JSON.stringify({ model: getModel() }) })).json();
  return r.data.session_id;
}

export interface UiEvent {
  kind: "connected" | "question" | "checkpoint" | "final" | "error" | "ack";
  payload?: any;
  taskId?: string;
}

export class StudioClient {
  ws: WebSocket | null = null;
  sessionId = "";
  taskId = "";
  clarifyId = "";
  checkpointId = "";
  private hb: any = null;
  private subTimer: any = null;
  constructor(private onEvent: (e: UiEvent) => void) {}

  private open(sessionId: string, onConnected: () => void) {
    this.sessionId = sessionId;
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/v2/ws?client_id=web_${Date.now()}_${rid()}&session_id=${sessionId}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onmessage = (e) => this.onMessage(JSON.parse(e.data), onConnected);
    ws.onclose = () => { if (this.hb) clearInterval(this.hb); };
    this.hb = setInterval(() => this.send({ type: "ping", req_id: "ping_" + Date.now() + "_" + rid() }), 20000);
  }
  private send(o: any) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(o)); }

  private onMessage(m: any, onConnected: () => void) {
    if (m.type === "connected") { this.onEvent({ kind: "connected" }); onConnected(); return; }
    if (m.type === "pong") return;
    if (m.type === "ack") {
      if (m.data?.task_id) this.taskId = m.data.task_id;
      // resume: pending question/checkpoint embedded in subscribe/query ack
      if (m.data?.pending_question) this.handleQuestion(m.data.pending_question);
      else if (m.data?.pending_checkpoint) this.handleCheckpoint(m.data.pending_checkpoint);
      // resume a terminal task: a done task carries final_result; a failed one has status.
      else if (m.data?.final_result) this.onEvent({ kind: "final", payload: { final_result: m.data.final_result }, taskId: this.taskId });
      else if (m.data?.status === "failed") this.onEvent({ kind: "error", payload: { message: "[FAILED] 任务已结束（失败或超时取消）" }, taskId: this.taskId });
      this.onEvent({ kind: "ack", payload: m });
      return;
    }
    if (m.type === "question") this.handleQuestion(m.payload);
    else if (m.type === "checkpoint") this.handleCheckpoint(m.payload);
    else if (m.type === "final") this.onEvent({ kind: "final", payload: m.payload });
    else if (m.type === "error") this.onEvent({ kind: "error", payload: m.payload });
  }
  private handleQuestion(p: any) { this.clarifyId = p.clarify_id; this.onEvent({ kind: "question", payload: p, taskId: this.taskId }); }
  private handleCheckpoint(p: any) { this.checkpointId = p.checkpoint_id; this.onEvent({ kind: "checkpoint", payload: p, taskId: this.taskId }); }

  async start(query: string) {
    const sid = await createSession();
    this.open(sid, () => {
      this.send({ type: "create_task", req_id: "create_task_" + Date.now() + "_" + rid(),
        payload: { command: "create_full", options: { allow_clarify: true, enable_sub_checkpoints: true }, params: { query, context: null }, session_id: sid } });
    });
    // task_id arrives in ack; subscribe once known
    this.subTimer = setInterval(() => { if (this.taskId) { clearInterval(this.subTimer); this.send({ type: "subscribe_task", req_id: "subscribe_task_" + Date.now() + "_" + rid(), payload: { session_id: this.sessionId, task_id: this.taskId } }); } }, 100);
  }
  resume(sessionId: string, taskId: string) {
    this.taskId = taskId;
    this.open(sessionId, () => this.send({ type: "query_task", req_id: "query_task_" + Date.now() + "_" + rid(), payload: { session_id: sessionId, task_id: taskId } }));
  }
  answer(option_id: number, text: string) {
    this.send({ type: "answer", req_id: "answer_" + Date.now() + "_" + rid(), payload: { clarify_id: this.clarifyId, option_id, text, session_id: this.sessionId, task_id: this.taskId } });
  }
  decide(option_id: number, text: string) {
    this.send({ type: "checkpoint_decision", req_id: "checkpoint_decision_" + Date.now() + "_" + rid(), payload: { checkpoint_id: this.checkpointId, option_id, text, session_id: this.sessionId, task_id: this.taskId } });
  }

  /** Start a one-shot tool task (e.g. simulate_verify). Reuses the same WS event pipeline. */
  async startTool(command: string, query: string, lockedGdd: string) {
    const sid = await createSession();
    this.open(sid, () => {
      this.send({
        type: "create_task",
        req_id: "create_task_" + Date.now() + "_" + rid(),
        payload: {
          command,
          options: { allow_clarify: true, enable_sub_checkpoints: true },
          params: { query, context: null, locked_gdd: lockedGdd },
          session_id: sid,
        },
      });
    });
    this.subTimer = setInterval(() => {
      if (this.taskId) {
        clearInterval(this.subTimer);
        this.send({ type: "subscribe_task", req_id: "subscribe_task_" + Date.now() + "_" + rid(), payload: { session_id: this.sessionId, task_id: this.taskId } });
      }
    }, 100);
  }

  close() { if (this.hb) clearInterval(this.hb); if (this.subTimer) clearInterval(this.subTimer); this.ws?.close(); }
}

/** SSE streaming for 剧情审核 (story-review). */
export async function streamStoryReview(
  { fileText, goal }: { fileText: string; goal: string },
  onToken: (text: string) => void,
  onDone: () => void,
): Promise<void> {
  const BASE = "/api";

  // 1. Create chat session
  const sessionRes = await fetch(`${BASE}/chat/session`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-anthropic-key": getKey() },
    body: JSON.stringify({ workflow_id: "chat_story_review" }),
  });
  const sessionData = await sessionRes.json();
  const session_id: string = sessionData.session_id ?? sessionData.data?.session_id ?? "";

  // 2. Stream messages
  const streamRes = await fetch(`${BASE}/chat/sessions/messages/stream`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-anthropic-key": getKey() },
    body: JSON.stringify({ session_id, file_text: fileText, goal }),
  });

  if (!streamRes.body) { onDone(); return; }

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let lastEvent = ""; // hoisted: an event/data pair may split across read() chunks

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("event:")) {
        lastEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const raw = line.slice(5).trim();
        if (lastEvent === "token") {
          try {
            const obj = JSON.parse(raw);
            if (obj.text) onToken(obj.text);
          } catch { /* ignore malformed */ }
        } else if (lastEvent === "done") {
          onDone();
          return;
        }
      }
    }
  }
  onDone();
}
