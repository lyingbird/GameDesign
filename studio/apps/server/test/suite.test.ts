// Automated test suite (node:test via tsx — zero extra deps).
// Run: pnpm --filter @gdf/server test
//
// Env must be set BEFORE importing the env-sensitive server modules (store reads
// GDF_DATA_DIR / GDF_MAX_TASKS at module load), so those are dynamic imports.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.GDF_MOCK = "1";
const DATA_DIR = mkdtempSync(join(tmpdir(), "gdf-test-"));
process.env.GDF_DATA_DIR = DATA_DIR;
process.env.GDF_MAX_TASKS = "3";

// Env-free modules: safe as static imports.
import {
  NODES, NODE_BY_ID, NODE_BY_SEQ, nextNode, stageLabel, phaseOf, PHASES,
  LIMITS, CUSTOM_OPTION_ID, NextStepSchema, ValidationReportSchema,
} from "@gdf/shared";
import { loadKb, matchGenre, methodologyFor, nodeCard } from "@gdf/shared/kb";
import { buildNodeSystemPrompt } from "../src/context.js";
import { assembleFinal } from "../src/assemble.js";

// Env-sensitive: import after env is set.
const { Store } = await import("../src/store.js");
const { Engine } = await import("../src/engine.js");

const cleanData = () => { rmSync(DATA_DIR, { recursive: true, force: true }); mkdirSync(DATA_DIR, { recursive: true }); };
const taskFiles = () => readdirSync(DATA_DIR).filter((f) => /^task-.+\.json$/.test(f));

// ───────────────────────────── shared: nodes ─────────────────────────────
describe("shared/nodes", () => {
  test("11-node registry with 7 interactive + 4 auto", () => {
    assert.equal(NODES.length, 11);
    assert.equal(LIMITS.TOTAL_NODES, 11);
    assert.equal(NODES.filter((n) => n.type === "interactive").length, 7);
    assert.equal(NODES.filter((n) => n.type === "auto").length, 4);
  });
  test("seq + id maps are consistent and contiguous 1..11", () => {
    for (let s = 1; s <= 11; s++) assert.equal(NODE_BY_SEQ[s].seq, s);
    for (const n of NODES) assert.equal(NODE_BY_ID[n.id].id, n.id);
  });
  test("nextNode advances and terminates", () => {
    assert.equal(nextNode(1)?.seq, 2);
    assert.equal(nextNode(11), undefined);
  });
  test("stageLabel + phaseOf grouping", () => {
    assert.match(stageLabel(NODE_BY_SEQ[1]), /^P1\/11 /);
    assert.equal(phaseOf(1)?.key, "ideation");
    assert.equal(phaseOf(11)?.key, "review");
    // every node belongs to exactly one phase
    for (const n of NODES) assert.ok(phaseOf(n.seq), `node ${n.seq} has a phase`);
    assert.equal(PHASES.flatMap((p) => p.nodeSeqs).length, 11);
  });
});

// ──────────────────────────── shared: schemas ────────────────────────────
describe("shared/schemas", () => {
  test("NextStep accepts a valid 'ask' step", () => {
    const ok = NextStepSchema.parse({
      action: "ask", question: "q", message: "m",
      options: [{ option_id: 1, text: "a" }, { option_id: 0, text: "custom" }],
      recommended_option_id: 1,
    });
    assert.equal(ok.action, "ask");
  });
  test("NextStep rejects an invalid action", () => {
    assert.throws(() => NextStepSchema.parse({ action: "bogus" }));
  });
  test("ValidationReport round-trips", () => {
    const r = ValidationReportSchema.parse({
      overall_score: 5, verdict: "WARN",
      dimensions: [{ name: "经济循环", score: 5 }],
      risks: [{ severity: "高", title: "t", detail: "d" }],
      tuning: ["x"],
    });
    assert.equal(r.verdict, "WARN");
  });
  test("CUSTOM_OPTION_ID is 0", () => assert.equal(CUSTOM_OPTION_ID, 0));
});

// ───────────────────────────────── KB ────────────────────────────────────
describe("shared/kb", () => {
  const kb = loadKb(true);
  test("regression: AGENTS.md / README.md are NOT loaded as entries", () => {
    const allIds = [...kb.nodes, ...kb.methodology, ...kb.genres, ...kb.gddSchema].map((e) => e.id);
    assert.ok(!allIds.some((id) => /agents/i.test(id)), `no AGENTS entry, got: ${allIds.join(",")}`);
    assert.ok(!allIds.some((id) => /readme/i.test(id)));
  });
  test("exact KB counts", () => {
    assert.equal(kb.nodes.length, 11, "11 node cards");
    assert.equal(kb.methodology.length, 11, "11 methodology cards");
    assert.equal(kb.genres.length, 21, "21 genre cards (20 original + platformer)");
    assert.equal(kb.gddSchema.length, 2, "2 gdd-schema cards");
  });
  test("matchGenre resolves the new platformer card", () => {
    assert.equal(matchGenre(kb, "我想做一个平台跳跃游戏，单人开发")?.id, "platformer");
    assert.equal(matchGenre(kb, "a precision platformer like Celeste")?.id, "platformer");
  });
  test("matchGenre still resolves existing genres", () => {
    assert.equal(matchGenre(kb, "我想做一个塔防游戏")?.id, "tower-defense");
  });
  test("methodologyFor maps cards to nodes", () => {
    const ids = methodologyFor(kb, "core_loop").map((m) => m.id);
    assert.ok(ids.includes("core-loop"));
    assert.equal(nodeCard(kb, "creative_intake")?.id, "creative_intake");
  });
});

// ─────────────────────────────── context ─────────────────────────────────
describe("server/context", () => {
  test("per-node prompt includes node card + methodology + matched genre, never AGENTS", () => {
    const prompt = buildNodeSystemPrompt(NODE_BY_ID["genre_scope"], { query: "我想做一个塔防游戏" });
    assert.ok(prompt.includes("genre_scope"));
    assert.ok(prompt.includes("tower-defense"), "matched genre card is injected");
    assert.ok(!/^#+\s+AGENTS/m.test(prompt) && !prompt.includes("MANUAL:"), "no AGENTS doc leaked into prompt");
  });
});

// ─────────────────────────────── assemble ────────────────────────────────
describe("server/assemble", () => {
  test("assembleFinal emits all 10 chapters + a confirmation card", () => {
    const md = assembleFinal({
      title: "测试游戏",
      sections: [
        { gdd_section: 1, title: "概述", markdown: "## 1 游戏概述\n正文" },
        { gdd_section: 5, title: "循环", markdown: "## 5 核心循环\n正文" },
      ],
    });
    assert.ok(md.startsWith("# 《测试游戏》"));
    assert.ok(md.includes("## 确认卡"));
    assert.ok(md.includes("✅ 第 1 章"), "present chapter is checked");
    assert.ok(md.includes("⬜ 第 2 章"), "missing chapter is unchecked");
    assert.ok(md.includes("_（本章待补充）_"), "missing chapter shows placeholder");
  });
});

// ──────────────────────────────── store ──────────────────────────────────
describe("server/store", () => {
  test("session + task creation defaults", () => {
    cleanData();
    const store = new Store();
    const s = store.createSession("u1", "mock", "claude-opus-4-8");
    assert.match(s.session_id, /^sess_/);
    const t = store.createTask(s, "我想做一个很长很长很长很长很长很长的游戏想法描述文本");
    assert.equal(t.status, "running");
    assert.equal(t.current_node_seq, 1);
    assert.equal(t.title.length, 24, "title is sliced to 24 chars");
  });

  test("concurrency limit at LIMITS.USER_CONCURRENT_TASKS", () => {
    cleanData();
    const store = new Store();
    const s = store.createSession("u2", "mock", "m");
    assert.equal(store.atConcurrencyLimit("u2"), false);
    store.createTask(s, "a");
    store.createTask(s, "b");
    assert.equal(store.activeCount("u2"), LIMITS.USER_CONCURRENT_TASKS);
    assert.equal(store.atConcurrencyLimit("u2"), true);
  });

  test("atomic persist + reload round-trips a terminal task", () => {
    cleanData();
    const a = new Store();
    const s = a.createSession("u3", "mock", "m");
    const t = a.createTask(s, "持久化测试");
    t.status = "done";
    (t.designContext as Record<string, unknown>).note = "hello";
    a.persist(t);
    assert.equal(taskFiles().length, 1);
    assert.ok(!readdirSync(DATA_DIR).some((f) => f.endsWith(".tmp")), "no leftover temp file");
    const b = new Store(); // fresh load from disk
    const loaded = b.getTask(t.task_id);
    assert.ok(loaded, "task reloaded");
    assert.equal(loaded!.status, "done");
    assert.equal((loaded!.designContext as Record<string, unknown>).note, "hello");
  });

  test("reload marks orphaned running/waiting tasks failed", () => {
    cleanData();
    const a = new Store();
    const s = a.createSession("u4", "mock", "m");
    const t = a.createTask(s, "孤儿任务"); // status running
    a.persist(t);
    const b = new Store();
    assert.equal(b.getTask(t.task_id)?.status, "failed");
  });

  test("prune keeps only the newest GDF_MAX_TASKS terminal tasks", () => {
    cleanData();
    const store = new Store();
    const s = store.createSession("u5", "mock", "m");
    for (let i = 0; i < 6; i++) {
      const t = store.createTask(s, "t" + i);
      t.status = "done";
      t.created_at = `2026-06-19T00:00:${String(i).padStart(2, "0")}.000Z`; // strictly increasing
      store.persist(t); // each terminal persist triggers prune
    }
    assert.equal(taskFiles().length, 3, "only 3 files on disk (MAX=3)");
    assert.equal([...store.tasks.values()].length, 3, "only 3 tasks in memory");
  });

  test("corrupt task file is skipped without throwing", () => {
    cleanData();
    writeFileSync(join(DATA_DIR, "task-bad.json"), "{ not valid json");
    let store: InstanceType<typeof Store> | null = null;
    assert.doesNotThrow(() => { store = new Store(); });
    assert.equal(store!.getTask("bad"), undefined);
  });
});

// ──────────────────────── engine: full mock run ──────────────────────────
describe("server/engine (GDF_MOCK end-to-end)", () => {
  test("create_full drives 11 nodes to a final GDD frame", async () => {
    cleanData();
    const store = new Store();
    const engine = new Engine(store);
    const s = store.createSession("e1", "mock", "claude-opus-4-8");
    const t = store.createTask(s, "我想做一个塔防游戏，单人开发");

    const frames: any[] = [];
    store.on("frame:" + t.task_id, (f: any) => frames.push(f));

    await engine.start(t);

    // Drive every pending question/checkpoint by choosing the recommended option (1).
    let guard = 0;
    while (t.pending && guard++ < 200) {
      const p = t.pending;
      if (p.kind === "question") await engine.onAnswer(t, p.id, 1, "");
      else await engine.onDecision(t, p.id, 1, "");
    }

    assert.ok(guard < 200, "did not loop forever");
    assert.equal(t.status, "done");
    assert.equal(t.pending, null);
    const final = frames.find((f) => f.type === "final");
    assert.ok(final, "a final frame was emitted");
    assert.equal(final.payload.command, "create_full");
    assert.ok(final.payload.final_result.content.text.includes("## 确认卡"));
    // sanity: we passed through interactive questions and checkpoints
    assert.ok(frames.some((f) => f.type === "question"));
    assert.ok(frames.some((f) => f.type === "checkpoint"));
  });

  test("simulate_verify one-shot emits a scored report", async () => {
    cleanData();
    const store = new Store();
    const engine = new Engine(store);
    const s = store.createSession("e2", "mock", "m");
    const t = store.createTask(s, "数值验证", "simulate_verify", { locked_gdd: "金币产出=10/min" });

    const frames: any[] = [];
    store.on("frame:" + t.task_id, (f: any) => frames.push(f));
    await engine.start(t);

    assert.equal(t.status, "done");
    const final = frames.find((f) => f.type === "final");
    assert.ok(final);
    assert.equal(final.payload.command, "simulate_verify");
    assert.match(final.payload.final_result.content.text, /综合评分/);
  });
});

// final cleanup
after(() => { try { rmSync(DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ } });
