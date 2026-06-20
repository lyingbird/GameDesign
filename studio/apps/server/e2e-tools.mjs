import WebSocket from "ws";
const PORT = process.env.E2E_PORT || "8792";
const base = `http://127.0.0.1:${PORT}`;
const rid = () => Math.random().toString(16).slice(2);
const sample = "# 数值\n金币每波+100，建塔50，重抽20→40→80。exp(n)=100*1.15^n。离线=min(t,8h)*base*0.5";

// 1) Numeric validation (simulate_verify one-shot over WS)
async function numeric() {
  const sess = await (await fetch(base + "/api/v2/web/session", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json();
  const sid = sess.data.session_id;
  return await new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/api/v2/ws?client_id=web_${Date.now()}_x&session_id=${sid}`);
    let taskId = null;
    const send = (o) => ws.send(JSON.stringify(o));
    const t = setTimeout(() => resolve("TIMEOUT"), 40000);
    ws.on("message", (d) => {
      const m = JSON.parse(d); const p = m.payload || {};
      if (m.type === "connected") send({ type: "create_task", req_id: "create_task_" + Date.now() + "_" + rid(), payload: { command: "simulate_verify", options: { allow_clarify: true, enable_sub_checkpoints: true }, params: { query: "检查资源闭环与成长曲线", context: null, locked_gdd: sample }, session_id: sid } });
      else if (m.type === "ack" && m.data && m.data.task_id) { taskId = m.data.task_id; send({ type: "subscribe_task", req_id: "subscribe_task_" + Date.now() + "_" + rid(), payload: { session_id: sid, task_id: taskId } }); }
      else if (m.type === "final") { clearTimeout(t); ws.close(); resolve("FINAL len=" + (p.final_result?.content?.text?.length || 0) + " head=" + JSON.stringify((p.final_result?.content?.text || "").slice(0, 60))); }
      else if (m.type === "error") { clearTimeout(t); ws.close(); resolve("ERROR " + JSON.stringify(p).slice(0, 100)); }
    });
  });
}

// 2) Story review (SSE agent)
async function story() {
  const s = await (await fetch(base + "/api/chat/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflow_id: "chat_story_review" }) })).json();
  const session_id = s.data?.session_id ?? s.session_id;
  const res = await fetch(base + "/api/chat/sessions/messages/stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ session_id, file_text: "园丁守护花园，蘑菇是奶奶的意识。", goal: "检查叙事一致性" }) });
  const reader = res.body.getReader(); const dec = new TextDecoder();
  let tokens = 0, done = false, buf = "";
  while (true) {
    const { done: d, value } = await reader.read(); if (d) break;
    buf += dec.decode(value, { stream: true });
    for (const m of buf.matchAll(/event: (\w+)/g)) { if (m[1] === "token") tokens++; if (m[1] === "done") done = true; }
    buf = buf.slice(-200);
    if (done) break;
  }
  return `session=${session_id ? "ok" : "MISSING"} tokenEvents=${tokens} done=${done}`;
}

console.log("NUMERIC:", await numeric());
console.log("STORY  :", await story());
process.exit(0);
