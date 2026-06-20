import { useEffect, useRef, useState } from "react";
import {
  Button, Textarea, Input, Card, Radio, Tag, Space, Dialog, Loading,
} from "tdesign-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StudioClient, getKey, setKey, getModel, setModel, listTasks, streamStoryReview, type UiEvent } from "./client";

// ─── Inline from @gdf/shared (nodes.ts) ────────────────────────────────────
interface NodeDef { seq: number; id: string; name: string }
interface Phase { key: string; label: string; nodeSeqs: number[] }

const NODES: NodeDef[] = [
  { seq: 1, id: "creative_intake", name: "P0 创意接入：理解用户想法" },
  { seq: 2, id: "core_fantasy", name: "P1 核心幻想：玩家为什么想玩" },
  { seq: 3, id: "design_pillars", name: "P2 设计支柱：必须做/不做" },
  { seq: 4, id: "genre_scope", name: "P3 品类定位：像谁、做多大" },
  { seq: 5, id: "core_loop", name: "P4 核心循环：玩家反复做什么" },
  { seq: 6, id: "systems_resources", name: "P5 系统模块：哪些系统、资源流" },
  { seq: 7, id: "numeric_skeleton", name: "P6 数值骨架：公式方向、经济模型" },
  { seq: 8, id: "gdd_packaging", name: "P7 GDD装箱：综合生成完整策划案" },
  { seq: 9, id: "gate_review", name: "P8 门禁审核：审核+修订" },
  { seq: 10, id: "lock_dispatch", name: "P9 锁版+数值深写" },
  { seq: 11, id: "simulate_verify", name: "P10 模拟验证" },
];
const PHASES: Phase[] = [
  { key: "ideation", label: "灵感共创", nodeSeqs: [1, 2] },
  { key: "shaping", label: "方案定型", nodeSeqs: [3, 4] },
  { key: "deepening", label: "专业深化", nodeSeqs: [5, 6, 7] },
  { key: "review", label: "审核锁定", nodeSeqs: [8, 9, 10, 11] },
];
function phaseOf(nodeSeq: number): Phase | undefined {
  return PHASES.find((p) => p.nodeSeqs.includes(nodeSeq));
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AppMode = "chat" | "numeric" | "story";

type Item =
  | { t: "question"; p: any }
  | { t: "checkpoint"; p: any }
  | { t: "final"; text: string }
  | { t: "error"; msg: string };

interface Artifact {
  id: string;
  title: string;
  text: string;
  createdAt: Date;
}

interface TaskRow {
  task_id: string;
  session_id: string;
  title: string;
  status: string;
  current_node?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function download(text: string, name = "GDD.md") {
  const blob = new Blob([text], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function statusColor(s: string) {
  if (s === "completed") return "#00a870";
  if (s === "running" || s === "active") return "#0052d9";
  if (s === "cancelled" || s === "error") return "#d54941";
  return "#888";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Md({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

function ItemView({ it }: { it: Item }) {
  if (it.t === "question") return (
    <Card style={{ marginTop: 12 }}>
      <Tag theme="primary" variant="light">P{it.p.node_seq} {it.p.node_name}</Tag>
      <h4 style={{ margin: "8px 0" }}>{it.p.question}</h4>
      <Md text={it.p.message} />
    </Card>
  );
  if (it.t === "checkpoint") return (
    <Card style={{ marginTop: 12, background: "#f6f8ff" }}>
      <Tag theme="warning" variant="light">检查点 · {it.p.title}</Tag>
      <Md text={it.p.preview?.text ?? ""} />
    </Card>
  );
  if (it.t === "final") return (
    <Card title="最终 GDD" style={{ marginTop: 12 }}>
      <Button size="small" onClick={() => download(it.text)} style={{ marginBottom: 8 }}>导出 .md</Button>
      <Md text={it.text} />
    </Card>
  );
  if (it.t === "error" && it.msg) return (
    <Card style={{ marginTop: 12, borderColor: "#d54941" }}>
      <span style={{ color: "#d54941" }}>{it.msg}</span>
    </Card>
  );
  return null;
}

// ─── 4-Phase Progress Bar ─────────────────────────────────────────────────────

function PhaseProgress({ seq }: { seq: number }) {
  const activePhase = phaseOf(seq);
  const activeNode = NODES.find((n) => n.seq === seq);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Phase row */}
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {PHASES.map((phase) => {
          const isActive = activePhase?.key === phase.key;
          const isDone = activePhase ? PHASES.indexOf(phase) < PHASES.indexOf(activePhase) : false;
          return (
            <div
              key={phase.key}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 6,
                background: isActive ? "#0052d9" : isDone ? "#e0ffe8" : "#f0f0f0",
                color: isActive ? "#fff" : isDone ? "#00a870" : "#888",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                textAlign: "center",
                transition: "all 0.2s",
              }}
            >
              {phase.label}
            </div>
          );
        })}
      </div>
      {/* Current sub-step */}
      {activeNode && (
        <div style={{ fontSize: 12, color: "#0052d9", paddingLeft: 4 }}>
          当前步骤：{activeNode.name}
        </div>
      )}
    </div>
  );
}

// ─── Artifact Workbench ───────────────────────────────────────────────────────

function ArtifactWorkbench({ artifacts }: { artifacts: Artifact[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = artifacts.find((a) => a.id === selectedId) ?? artifacts[artifacts.length - 1] ?? null;

  return (
    <aside
      style={{
        width: 300,
        minWidth: 300,
        borderLeft: "1px solid #e7e7e7",
        display: "flex",
        flexDirection: "column",
        background: "#fafbfc",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e7e7e7", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>产物工作台</span>
        <Tag size="small" theme="primary" variant="light">{artifacts.length} 个产物</Tag>
      </div>

      {artifacts.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13 }}>
          暂无产物，检查点完成后自动收录
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          {/* 产物库 */}
          <div style={{ borderBottom: "1px solid #e7e7e7", padding: "8px 0", maxHeight: 180, overflowY: "auto" }}>
            <div style={{ padding: "0 16px 4px", fontSize: 11, color: "#888", fontWeight: 600 }}>产物库</div>
            {artifacts.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                style={{
                  padding: "6px 16px",
                  cursor: "pointer",
                  background: (selected?.id === a.id) ? "#e8f0fe" : "transparent",
                  borderLeft: (selected?.id === a.id) ? "3px solid #0052d9" : "3px solid transparent",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.title}
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  {a.text.length} 字 · {a.createdAt.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>

          {/* 内容预览 */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {selected ? (
              <>
                <div style={{ padding: "8px 16px", borderBottom: "1px solid #e7e7e7", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    内容预览 · {selected.title}
                  </span>
                  <Button
                    size="small"
                    variant="outline"
                    onClick={() => copyText(selected.text)}
                  >
                    复制
                  </Button>
                  <Button
                    size="small"
                    variant="outline"
                    onClick={() => download(selected.text, selected.title.replace(/\s+/g, "_") + ".md")}
                  >
                    下载
                  </Button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px", fontSize: 13 }}>
                  <Md text={selected.text} />
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── Numeric Validation Tool ──────────────────────────────────────────────────

function NumericTool() {
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState("");
  const [goal, setGoal] = useState("");
  const [report, setReport] = useState("");
  const [busy, setBusy] = useState(false);
  const clientRef = useRef<StudioClient | null>(null);

  const onEvent = (e: UiEvent) => {
    if (e.kind === "final") {
      setBusy(false);
      setReport(e.payload?.final_result?.content?.text ?? "");
    } else if (e.kind === "error") {
      setBusy(false);
      setReport("错误：" + (e.payload?.message ?? "未知错误"));
    }
  };

  const handleFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setFileText((e.target?.result as string) ?? "");
    reader.readAsText(file);
  };

  const submit = () => {
    if (!fileText.trim()) return;
    setBusy(true);
    setReport("");
    clientRef.current?.close();
    const c = new StudioClient(onEvent);
    clientRef.current = c;
    c.startTool("simulate_verify", goal.trim() || "请对以下数值规则进行验证", fileText);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h3 style={{ margin: "0 0 16px" }}>数值验证</h3>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>上传数值规则 / 资源表（.md 或 .txt）</div>
          <input type="file" accept=".md,.txt" onChange={handleFile} style={{ fontSize: 13 }} />
          {fileName && <span style={{ marginLeft: 10, fontSize: 12, color: "#0052d9" }}>{fileName}</span>}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>验证目标（可选）</div>
          <Textarea
            value={goal}
            onChange={setGoal}
            placeholder="例：检查资源闭环、难度曲线和潜在异常…"
            autosize={{ minRows: 2 }}
          />
        </div>
        <Button theme="primary" onClick={submit} disabled={busy || !fileText.trim()}>
          {busy ? "验证中…" : "开始验证"}
        </Button>
      </Card>

      {busy && <div style={{ padding: 16 }}><Loading text="AI 数值验证中…" /></div>}

      {report && (
        <Card title="验证报告">
          <Md text={report} />
        </Card>
      )}
    </div>
  );
}

// ─── Story Review Tool ────────────────────────────────────────────────────────

function StoryTool() {
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState("");
  const [goal, setGoal] = useState("");
  const [report, setReport] = useState("");
  const [busy, setBusy] = useState(false);

  const handleFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setFileText((e.target?.result as string) ?? "");
    reader.readAsText(file);
  };

  const submit = async () => {
    if (!fileText.trim()) return;
    setBusy(true);
    setReport("");
    await streamStoryReview(
      { fileText, goal: goal.trim() || "请对以下剧情进行审核" },
      (token) => setReport((prev) => prev + token),
      () => setBusy(false),
    );
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h3 style={{ margin: "0 0 16px" }}>剧情审核</h3>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>上传剧情大纲 / 世界观 / 任务文本（.md 或 .txt）</div>
          <input type="file" accept=".md,.txt" onChange={handleFile} style={{ fontSize: 13 }} />
          {fileName && <span style={{ marginLeft: 10, fontSize: 12, color: "#0052d9" }}>{fileName}</span>}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>审核目标（可选）</div>
          <Textarea
            value={goal}
            onChange={setGoal}
            placeholder="例：检查结构一致性、人物动机和世界观冲突…"
            autosize={{ minRows: 2 }}
          />
        </div>
        <Button theme="primary" onClick={submit} disabled={busy || !fileText.trim()}>
          {busy ? "审核中…" : "开始审核"}
        </Button>
      </Card>

      {busy && report === "" && <div style={{ padding: 16 }}><Loading text="AI 剧情审核中…" /></div>}

      {report && (
        <Card title="审核报告">
          <Md text={report} />
        </Card>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function App() {
  const [keyOpen, setKeyOpen] = useState(!getKey());
  const [apiKey, setApiKey] = useState(getKey());
  const [model, setModelState] = useState(getModel());
  const [mode, setMode] = useState<AppMode>("chat");

  const [query, setQuery] = useState("");
  const [started, setStarted] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [pending, setPending] = useState<{ kind: "question" | "checkpoint"; p: any } | null>(null);
  const [seq, setSeq] = useState(0);
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const clientRef = useRef<StudioClient | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // sidebar state
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [items, pending]);

  const fetchTasks = () => {
    if (!getKey()) return;
    listTasks().then((rows: any[]) => setTasks(rows as TaskRow[])).catch(() => {});
  };

  useEffect(() => { fetchTasks(); }, []);

  const onEvent = (e: UiEvent) => {
    if (e.kind === "question") {
      setBusy(false); setSeq(e.payload.node_seq);
      setItems((x) => [...x, { t: "question", p: e.payload }]);
      setPending({ kind: "question", p: e.payload }); setChoice(e.payload.default_option?.option_id ?? null); setCustom("");
    } else if (e.kind === "checkpoint") {
      setBusy(false); setSeq(e.payload.node_seq);
      setItems((x) => [...x, { t: "checkpoint", p: e.payload }]);
      setPending({ kind: "checkpoint", p: e.payload }); setChoice(e.payload.default_option?.option_id ?? 1); setCustom("");
      // Collect artifact
      if (e.payload.title && e.payload.preview?.text) {
        setArtifacts((prev) => [
          ...prev,
          {
            id: e.payload.checkpoint_id ?? String(Date.now()),
            title: e.payload.title,
            text: e.payload.preview.text,
            createdAt: new Date(),
          },
        ]);
      }
    } else if (e.kind === "final") {
      const text: string = e.payload?.final_result?.content?.text ?? "";
      setBusy(false); setSeq(11); setPending(null);
      setItems((x) => [...x, { t: "final", text }]);
      // Final GDD as artifact
      if (text) {
        setArtifacts((prev) => [
          ...prev,
          { id: "final_gdd", title: "最终 GDD", text, createdAt: new Date() },
        ]);
      }
      fetchTasks();
    } else if (e.kind === "error") {
      setBusy(false); setPending(null);
      setItems((x) => [...x, { t: "error", msg: e.payload.message }]);
    }
  };

  const start = () => {
    if (!query.trim()) return;
    if (!getKey()) { setKeyOpen(true); return; }
    clientRef.current?.close();
    const c = new StudioClient(onEvent);
    clientRef.current = c;
    setStarted(true); setBusy(true); setItems([]); setArtifacts([]); setPending(null); setSeq(0); setActiveTaskId(null);
    c.start(query.trim());
    setTimeout(fetchTasks, 2000);
  };

  const resumeTask = (task: TaskRow) => {
    if (!getKey()) { setKeyOpen(true); return; }
    clientRef.current?.close();
    const c = new StudioClient(onEvent);
    clientRef.current = c;
    setStarted(true); setBusy(true); setItems([]); setArtifacts([]); setPending(null); setSeq(0); setActiveTaskId(task.task_id);
    c.resume(task.session_id, task.task_id);
  };

  const goHome = () => {
    clientRef.current?.close();
    clientRef.current = null;
    setStarted(false); setItems([]); setArtifacts([]); setPending(null); setSeq(0); setBusy(false); setQuery(""); setActiveTaskId(null);
    fetchTasks();
  };

  const submit = () => {
    if (!pending || choice == null) return;
    const text = choice === 0 ? custom : (pending.p.options.find((o: any) => o.option_id === choice)?.text ?? "");
    setBusy(true);
    if (pending.kind === "question") clientRef.current?.answer(choice, text);
    else clientRef.current?.decide(choice, text);
    setPending(null);
  };

  const saveKey = () => {
    setKey(apiKey.trim());
    setModel(model.trim() || "claude-opus-4-8");
    setModelState(getModel());
    setKeyOpen(false);
    fetchTasks();
  };

  // Checkpoint confirm button text
  const confirmLabel = (p: any): string => {
    const opt1 = p.options?.find((o: any) => o.option_id === 1);
    return opt1 ? "确认并继续" : "提交";
  };
  const modifyLabel = (p: any): string => {
    const opt2 = p.options?.find((o: any) => o.option_id === 2 || o.option_id === 3);
    return opt2 ? "我想修改" : "";
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif", overflow: "hidden", flexDirection: "column" }}>
      {/* Top nav */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #e7e7e7", background: "#fff", padding: "0 24px", height: 48, flexShrink: 0, gap: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 15, marginRight: 24, color: "#0052d9" }}>GameDesignFlow</span>
        {(["chat", "numeric", "story"] as AppMode[]).map((m) => {
          const label = m === "chat" ? "AI 游戏生成" : m === "numeric" ? "数值验证" : "剧情审核";
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                padding: "0 16px",
                height: 48,
                fontSize: 14,
                fontWeight: mode === m ? 600 : 400,
                color: mode === m ? "#0052d9" : "#555",
                borderBottom: mode === m ? "2px solid #0052d9" : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <Button variant="outline" size="small" onClick={() => setKeyOpen(true)}>设置 API Key</Button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {mode !== "chat" ? (
          /* Tool pages: full-width, no sidebar */
          <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            {mode === "numeric" ? <NumericTool /> : <StoryTool />}
          </main>
        ) : (
          <>
            {/* Left sidebar */}
            <aside style={{ width: 240, minWidth: 240, background: "#f7f8fa", borderRight: "1px solid #e7e7e7", display: "flex", flexDirection: "column", padding: "12px 0" }}>
              <div style={{ padding: "0 12px 12px" }}>
                <Button theme="primary" block onClick={goHome}>+ 新建任务</Button>
              </div>
              <div style={{ padding: "0 12px 8px", fontSize: 12, color: "#888", fontWeight: 600 }}>我的任务</div>
              {!getKey() && (
                <div style={{ padding: "0 12px", fontSize: 12, color: "#888" }}>请先设置 API Key 以查看任务列表。</div>
              )}
              {getKey() && tasks.length === 0 && (
                <div style={{ padding: "0 12px", fontSize: 12, color: "#aaa" }}>暂无任务</div>
              )}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {tasks.map((task) => (
                  <div
                    key={task.task_id}
                    onClick={() => resumeTask(task)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      background: activeTaskId === task.task_id ? "#e8f0fe" : "transparent",
                      borderLeft: activeTaskId === task.task_id ? "3px solid #0052d9" : "3px solid transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { if (activeTaskId !== task.task_id) (e.currentTarget as HTMLDivElement).style.background = "#eff0f1"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = activeTaskId === task.task_id ? "#e8f0fe" : "transparent"; }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {task.title || "未命名任务"}
                    </div>
                    <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: statusColor(task.status), fontWeight: 500 }}>{task.status}</span>
                      {task.current_node && (
                        <span style={{ fontSize: 11, color: "#888" }}>· {task.current_node}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Main chat area */}
            <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>GameDesignFlow · AI 游戏设计</h2>
              </header>

              {started && <PhaseProgress seq={seq} />}

              {!started ? (
                <Card>
                  <p style={{ color: "#888" }}>一句话开始 → AI 帮你敲定 GDD → 多维度验证 → 一键交付</p>
                  <Textarea value={query} onChange={setQuery} placeholder="描述你的游戏想法，AI 会引导你逐步形成可交付方案…" autosize={{ minRows: 3 }} />
                  <div style={{ marginTop: 12 }}><Button theme="primary" onClick={start}>开始</Button></div>
                </Card>
              ) : (
                <div>
                  {items.map((it, i) => <ItemView key={i} it={it} />)}
                  {pending && (
                    <Card
                      title={pending.kind === "checkpoint" ? (pending.p.title || "确认检查点") : "请选择"}
                      style={{ marginTop: 12, borderColor: "#0052d9" }}
                    >
                      {pending.kind === "checkpoint" ? (
                        /* Checkpoint: confirm / modify buttons */
                        <Space>
                          <Button
                            theme="primary"
                            onClick={() => { setChoice(1); setTimeout(submit, 0); }}
                            disabled={busy}
                          >
                            {confirmLabel(pending.p)}
                          </Button>
                          {modifyLabel(pending.p) && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                const modOpt = pending.p.options?.find((o: any) => o.option_id === 2 || o.option_id === 3);
                                if (modOpt) { setChoice(modOpt.option_id); setTimeout(submit, 0); }
                              }}
                              disabled={busy}
                            >
                              {modifyLabel(pending.p)}
                            </Button>
                          )}
                        </Space>
                      ) : (
                        /* Question: radio options */
                        <>
                          <Radio.Group value={choice ?? undefined} onChange={(v) => setChoice(Number(v))}>
                            <Space direction="vertical">
                              {pending.p.options.map((o: any) => (
                                <Radio key={o.option_id} value={o.option_id}>
                                  {o.text}{o.option_id === pending.p.default_option?.option_id ? " ·（推荐）" : ""}
                                </Radio>
                              ))}
                            </Space>
                          </Radio.Group>
                          {choice === 0 && (
                            <Textarea value={custom} onChange={setCustom} placeholder="自定义：填写你的想法…" autosize={{ minRows: 2 }} style={{ marginTop: 8 }} />
                          )}
                          <div style={{ marginTop: 12 }}>
                            <Button theme="primary" onClick={submit} disabled={busy}>提交</Button>
                          </div>
                        </>
                      )}
                    </Card>
                  )}
                  {busy && <div style={{ padding: 16 }}><Loading text="AI 生成中…" /></div>}
                  <div ref={bottomRef} />
                </div>
              )}
            </main>

            {/* Right: Artifact Workbench (only when started) */}
            {started && <ArtifactWorkbench artifacts={artifacts} />}
          </>
        )}
      </div>

      <Dialog header="设置 API Key" visible={keyOpen} onConfirm={saveKey} onClose={() => setKeyOpen(false)} confirmBtn="保存">
        <p style={{ color: "#888", fontSize: 13 }}>填入你的 Anthropic API Key（仅存于本浏览器，请求时透传给本地 server，不落库）。</p>
        <Input type="password" value={apiKey} onChange={setApiKey} placeholder="sk-ant-..." />
        <div style={{ marginTop: 8 }}><Input value={model} onChange={setModelState} placeholder="claude-opus-4-8" /></div>
      </Dialog>
    </div>
  );
}
