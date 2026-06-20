// WebSocket gateway: connection handshake, frame routing, ack/pong, heartbeat,
// subscription fan-out, and resume via pending_*.
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { newEventId, Store, type TaskRec } from "./store.js";
import { Engine } from "./engine.js";
import { LIMITS } from "@gdf/shared";

const WS_PATH = "/api/v2/ws";

export function attachWs(server: Server, store: Store, engine: Engine) {
  const wss = new WebSocketServer({ server, path: WS_PATH });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const sessionId = url.searchParams.get("session_id") ?? "";
    const session = store.getSession(sessionId);

    send(ws, {
      type: "connected", session_id: sessionId, event_id: newEventId(),
      heartbeat_interval: LIMITS.HEARTBEAT_SEC, server_version: "v2.0", active_task: null,
    });

    // subscription bookkeeping: task_id -> store listener
    const subs = new Map<string, (frame: unknown) => void>();
    const subscribe = (taskId: string) => {
      if (subs.has(taskId)) return;
      const fn = (frame: unknown) => send(ws, frame);
      subs.set(taskId, fn);
      store.on("frame:" + taskId, fn);
    };
    const unsubAll = () => { for (const [tid, fn] of subs) store.off("frame:" + tid, fn); subs.clear(); };

    ws.on("message", async (raw) => {
      let m: any;
      try { m = JSON.parse(String(raw)); } catch { return; }
      const reqId = m.req_id as string;
      switch (m.type) {
        case "ping":
          send(ws, { type: "pong", ack_of: reqId, server_time: new Date().toISOString() });
          break;
        case "create_task": {
          if (!session) return ackErr(ws, reqId, "SESSION_NOT_FOUND", "session not found");
          if (store.atConcurrencyLimit(session.uid))
            return ackErr(ws, reqId, "USER_CONCURRENT_LIMIT", `uid "${session.uid}" reached limit ${LIMITS.USER_CONCURRENT_TASKS}`);
          const query = String(m.payload?.params?.query ?? "");
          const command = String(m.payload?.command ?? "create_full");
          const locked_gdd = m.payload?.params?.locked_gdd !== undefined ? String(m.payload.params.locked_gdd) : undefined;
          const task = store.createTask(session, query, command, { locked_gdd });
          store.recordIn(task, m);
          ack(ws, reqId, { session_id: session.session_id, task_id: task.task_id });
          subscribe(task.task_id);
          engine.start(task).catch((e) => console.error("engine.start", e));
          break;
        }
        case "subscribe_task": {
          const task = store.getTask(m.payload?.task_id);
          if (!task) return ackErr(ws, reqId, "INTERNAL_ERROR", "task not found");
          subscribe(task.task_id);
          ack(ws, reqId, taskState(task));
          break;
        }
        case "query_task": {
          const task = store.getTask(m.payload?.task_id);
          if (!task) return ackErr(ws, reqId, "INTERNAL_ERROR", "task not found");
          ack(ws, reqId, taskState(task));
          break;
        }
        case "answer": {
          const task = store.getTask(m.payload?.task_id);
          if (!task) return;
          store.recordIn(task, m);
          ack(ws, reqId, { ok: true });
          await engine.onAnswer(task, m.payload.clarify_id, m.payload.option_id, m.payload.text ?? "")
            .catch((e) => console.error("onAnswer", e));
          break;
        }
        case "checkpoint_decision": {
          const task = store.getTask(m.payload?.task_id);
          if (!task) return;
          store.recordIn(task, m);
          ack(ws, reqId, { ok: true });
          await engine.onDecision(task, m.payload.checkpoint_id, m.payload.option_id, m.payload.text ?? "")
            .catch((e) => console.error("onDecision", e));
          break;
        }
      }
    });

    ws.on("close", unsubAll);
    ws.on("error", unsubAll);
  });

  return wss;
}

function taskState(task: TaskRec) {
  const pending = task.pending;
  const lastOut = [...task.frames].reverse().find((f) => f.dir === "out")?.frame ?? null;
  return {
    command: task.command, created_at: task.created_at, current_node: task.current_node_id,
    current_node_seq: task.current_node_seq, status: task.status,
    final_result: task.final_text ? { content: { format: "markdown", text: task.final_text } } : null,
    finished_at: task.finished_at ?? "", last_out_frame: lastOut,
    pending_question: pending?.kind === "question" ? (pending.frame as any).payload : null,
    pending_checkpoint: pending?.kind === "checkpoint" ? (pending.frame as any).payload : null,
  };
}

function send(ws: WebSocket, obj: unknown) { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj)); }
function ack(ws: WebSocket, ack_of: string, data: unknown) { send(ws, { type: "ack", ack_of, status: "ok", data }); }
function ackErr(ws: WebSocket, ack_of: string, code: string, message: string) {
  send(ws, { type: "ack", ack_of, status: "error", error: { code, message } });
}
