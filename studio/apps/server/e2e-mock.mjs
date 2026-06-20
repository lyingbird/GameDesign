import WebSocket from "ws";
const PORT = process.env.E2E_PORT || "8791";
const base = `http://127.0.0.1:${PORT}`;
const rid = () => Math.random().toString(16).slice(2);
const req = (type, payload) => ({ type, req_id: `${type}_${Date.now()}_${rid()}`, payload });

const sess = await (await fetch(base + "/api/v2/web/session", {
  method: "POST", headers: { "content-type": "application/json" }, body: "{}",
})).json();
const sid = sess.data.session_id;
console.log("session:", sid);

const ws = new WebSocket(`ws://127.0.0.1:${PORT}/api/v2/ws?client_id=web_${Date.now()}_x&session_id=${sid}`);
let taskId = null, q = 0, c = 0;
const send = (o) => ws.send(JSON.stringify(o));

ws.on("message", (d) => {
  const m = JSON.parse(d); const p = m.payload || {};
  if (m.type === "connected") {
    send(req("create_task", { command: "create_full", options: { allow_clarify: true, enable_sub_checkpoints: true }, params: { query: "测试塔防游戏", context: null }, session_id: sid }));
  } else if (m.type === "ack" && m.data && m.data.task_id) {
    taskId = m.data.task_id;
    send(req("subscribe_task", { session_id: sid, task_id: taskId }));
  } else if (m.type === "question") {
    q++; console.log(`Q#${q}  node${p.node_seq} ${p.node_id}`);
    send(req("answer", { clarify_id: p.clarify_id, option_id: 1, text: p.options[0].text, session_id: sid, task_id: taskId }));
  } else if (m.type === "checkpoint") {
    c++; console.log(`CP#${c} node${p.node_seq} ${p.node_id}  (${p.title})`);
    send(req("checkpoint_decision", { checkpoint_id: p.checkpoint_id, option_id: 1, text: "同意继续", session_id: sid, task_id: taskId }));
  } else if (m.type === "final") {
    console.log(`\nFINAL ok. GDD len=${p.final_result.content.text.length}  questions=${q} checkpoints=${c}`);
    process.exit(0);
  } else if (m.type === "error") {
    console.log("ERROR " + JSON.stringify(p).slice(0, 160)); process.exit(3);
  }
});
setTimeout(() => { console.log(`TIMEOUT q=${q} c=${c}`); process.exit(2); }, 70000);
