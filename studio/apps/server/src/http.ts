// REST routes — unified {status,msg,data} envelope.
import type { FastifyInstance } from "fastify";
import { Store } from "./store.js";
import { DEFAULT_MODEL } from "./llm.js";

const ok = <T>(data: T) => ({ status: 0, msg: "ok", data });

export function registerRoutes(app: FastifyInstance, store: Store) {
  const uidOf = (req: any) => String(req.headers["x-gametalk-uid"] ?? "local");

  app.get("/api/config", async () => ok({ hasEnvKey: !!process.env.ANTHROPIC_API_KEY, defaultModel: DEFAULT_MODEL }));

  app.get("/api/user", async (req) => {
    const uid = uidOf(req);
    return ok({ uid, name: uid, avatar: "", game: "local", gameList: [{ id: "local", name: "本地空间", logo: "" }], permissions: ["home"] });
  });

  app.post("/api/v2/web/session", async (req) => {
    const uid = uidOf(req);
    const body = (req.body ?? {}) as { apiKey?: string; model?: string };
    const apiKey = String(req.headers["x-anthropic-key"] ?? body.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "") || null;
    const model = String(body.model ?? req.headers["x-gdf-model"] ?? DEFAULT_MODEL);
    const s = store.createSession(uid, apiKey, model);
    return ok({ session_id: s.session_id, uid: s.uid, status: s.status, task_count: s.task_count, created_at: s.created_at });
  });

  app.get("/api/v2/web/tasks", async (req) => {
    const uid = uidOf(req);
    const tasks = store.listTasks(uid).map((t) => ({
      task_id: t.task_id, session_id: t.session_id, command: t.command, status: t.status, title: t.title,
      current_node_id: t.current_node_id, current_node_seq: t.current_node_seq,
      created_at: t.created_at, updated_at: t.updated_at, finished_at: t.finished_at ?? "",
    }));
    return ok({ limit: 20, offset: 0, total: tasks.length, tasks });
  });

  app.get("/api/v2/web/task_detail", async (req) => {
    const id = String((req.query as any).task_id ?? "");
    const t = store.getTask(id);
    if (!t) return { status: 1, msg: "not found", data: null };
    return ok({
      command: t.command, created_at: t.created_at, current_node_id: t.current_node_id, current_node_seq: t.current_node_seq,
      status: t.status, final_result: t.final_text ? { content: { format: "markdown", text: t.final_text } } : null,
    });
  });

  app.get("/api/v2/web/task_timeline", async (req) => {
    const id = String((req.query as any).task_id ?? "");
    const t = store.getTask(id);
    if (!t) return { status: 1, msg: "not found", data: null };
    return ok({ frames: t.frames });
  });
}
