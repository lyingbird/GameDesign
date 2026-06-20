// In-memory session/task store with JSON persistence + a frame event bus.
import { EventEmitter } from "node:events";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ServerFrame } from "@gdf/shared";
import { LIMITS } from "@gdf/shared";

const DATA_DIR = process.env.GDF_DATA_DIR ?? join(process.cwd(), "data");
/** Cap on persisted terminal (done/failed) tasks; oldest beyond this are pruned. */
const MAX_TASKS = Math.max(1, Number(process.env.GDF_MAX_TASKS ?? 50) || 50);
const isTerminal = (s: TaskStatus) => s === "done" || s === "failed";

export type TaskStatus = "running" | "waiting" | "done" | "failed";

export interface Pending {
  kind: "question" | "checkpoint";
  id: string; // clarify_id or checkpoint_id
  node_seq: number;
  frame: ServerFrame;
  expires_at: number; // epoch ms
}

export interface TaskRec {
  task_id: string;
  session_id: string;
  uid: string;
  command: string;
  title: string;
  status: TaskStatus;
  current_node_id: string;
  current_node_seq: number;
  /** the evolving design blackboard (confirmed dimensions, drafted sections...). */
  designContext: Record<string, unknown>;
  /** full ordered frame log (the timeline). */
  frames: { seq: number; dir: "in" | "out"; frame: unknown; ts: string }[];
  pending: Pending | null;
  final_text: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

export interface SessionRec {
  session_id: string;
  uid: string;
  status: "active";
  apiKey: string | null;
  model: string;
  created_at: string;
  task_count: number;
}

const now = () => new Date().toISOString();

export class Store extends EventEmitter {
  sessions = new Map<string, SessionRec>();
  tasks = new Map<string, TaskRec>();

  constructor() {
    super();
    this.load();
  }

  // ---- sessions ----
  createSession(uid: string, apiKey: string | null, model: string): SessionRec {
    const id = "sess_" + rid(8) + "-" + rid(3);
    const s: SessionRec = { session_id: id, uid, status: "active", apiKey, model, created_at: now(), task_count: 0 };
    this.sessions.set(id, s);
    return s;
  }
  getSession(id: string) { return this.sessions.get(id); }

  // ---- tasks ----
  activeCount(uid: string): number {
    let n = 0;
    for (const t of this.tasks.values()) if (t.uid === uid && (t.status === "running" || t.status === "waiting")) n++;
    return n;
  }
  atConcurrencyLimit(uid: string): boolean {
    return this.activeCount(uid) >= LIMITS.USER_CONCURRENT_TASKS;
  }
  createTask(session: SessionRec, query: string, command: string = "create_full", extraParams: Record<string, unknown> = {}): TaskRec {
    const id = "04f3-" + Math.floor(Date.now() / 1000) + "-" + rid(4);
    const t: TaskRec = {
      task_id: id, session_id: session.session_id, uid: session.uid, command,
      title: query.slice(0, 24), status: "running", current_node_id: "creative_intake", current_node_seq: 1,
      designContext: { query, ...extraParams }, frames: [], pending: null, final_text: null,
      created_at: now(), updated_at: now(), finished_at: null,
    };
    this.tasks.set(id, t);
    session.task_count++;
    return t;
  }
  getTask(id: string) { return this.tasks.get(id); }
  listTasks(uid: string) {
    return [...this.tasks.values()].filter((t) => t.uid === uid).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  /** Append an outgoing server frame to the timeline and fan it out to subscribers. */
  emitFrame(task: TaskRec, frame: ServerFrame) {
    task.frames.push({ seq: task.frames.length, dir: "out", frame, ts: now() });
    task.updated_at = now();
    this.emit("frame:" + task.task_id, frame);
    this.persist(task);
  }
  recordIn(task: TaskRec, frame: unknown) {
    task.frames.push({ seq: task.frames.length, dir: "in", frame, ts: now() });
  }

  // ---- persistence (best-effort JSON, atomic) ----
  persist(task: TaskRec) {
    const tmp = join(DATA_DIR, `task-${task.task_id}.json.tmp`);
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      const final = join(DATA_DIR, `task-${task.task_id}.json`);
      // Crash-safe: write to a temp file then atomically rename, so a reader never
      // sees a half-written task-*.json (a torn file would fail JSON.parse on load).
      writeFileSync(tmp, JSON.stringify(task));
      renameSync(tmp, final);
      if (isTerminal(task.status)) this.prune();
    } catch {
      // best effort; don't leave an orphan temp if the rename failed.
      try { rmSync(tmp, { force: true }); } catch { /* ignore */ }
    }
  }

  /** Keep only the newest MAX_TASKS terminal tasks on disk + in memory. */
  private prune() {
    try {
      const terminal = [...this.tasks.values()]
        .filter((t) => isTerminal(t.status))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)); // newest first
      for (const t of terminal.slice(MAX_TASKS)) {
        rmSync(join(DATA_DIR, `task-${t.task_id}.json`), { force: true });
        this.tasks.delete(t.task_id);
      }
    } catch { /* best effort */ }
  }
  private load() {
    try {
      if (!existsSync(DATA_DIR)) return;
      const files = readdirSync(DATA_DIR).filter((f) => /^task-.+\.json$/.test(f));
      for (const file of files) {
        try {
          const raw = readFileSync(join(DATA_DIR, file), "utf-8");
          const task = JSON.parse(raw) as TaskRec;
          // Normalize non-terminal tasks: in-memory timers and WS subscribers are
          // gone after restart, so these tasks can never auto-resume. Mark failed.
          if (task.status === "running" || task.status === "waiting") {
            task.status = "failed";
            task.pending = null;
            if (!task.finished_at) task.finished_at = now();
          }
          this.tasks.set(task.task_id, task);
        } catch { /* skip corrupt file */ }
      }
    } catch { /* ignore directory-level errors */ }
  }
}

function rid(n: number): string {
  let s = "";
  while (s.length < n) s += Math.random().toString(16).slice(2);
  return s.slice(0, n);
}
export const newEventId = () => "evt_" + rid(8);
