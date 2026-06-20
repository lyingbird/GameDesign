// WebSocket frame protocol + REST envelope.

/** Unified REST envelope: { status, msg, data }. status 0 = success. */
export interface Envelope<T> {
  status: number;
  msg: string;
  data: T;
}

export const COMMAND = "create_full" as const;
/** WS task commands. create_full = 11-node workflow; simulate_verify = one-shot numeric validation. */
export type Command = "create_full" | "simulate_verify";

/** mode-2 file tools (entered via /ai-chat/middle?feature=&mode=). */
export const FEATURES = {
  "numeric-validation": { mode: 2, command: "simulate_verify" as Command, accept: ".md,.txt" },
} as const;
export type FeatureId = keyof typeof FEATURES;

// ---------- Client → Server frames ----------
export interface ClientFrameBase {
  type: string;
  req_id: string;
  payload: Record<string, unknown>;
}
export interface CreateTaskFrame extends ClientFrameBase {
  type: "create_task";
  payload: {
    command: Command;
    options: { allow_clarify: boolean; enable_sub_checkpoints: boolean };
    /** create_full: {query}. simulate_verify: {query, locked_gdd: <uploaded file text>}. */
    params: { query: string; context: string | null; locked_gdd?: string };
    session_id: string;
  };
}
export interface SubscribeTaskFrame extends ClientFrameBase {
  type: "subscribe_task";
  payload: { session_id: string; task_id: string };
}
export interface QueryTaskFrame extends ClientFrameBase {
  type: "query_task";
  payload: { session_id: string; task_id: string };
}
export interface AnswerFrame extends ClientFrameBase {
  type: "answer";
  payload: { clarify_id: string; option_id: number; text: string; session_id: string; task_id: string };
}
export interface CheckpointDecisionFrame extends ClientFrameBase {
  type: "checkpoint_decision";
  payload: { checkpoint_id: string; option_id: number; text: string; session_id: string; task_id: string };
}
export interface PingFrame { type: "ping"; req_id: string }
export type ClientFrame =
  | CreateTaskFrame | SubscribeTaskFrame | QueryTaskFrame
  | AnswerFrame | CheckpointDecisionFrame | PingFrame;

// ---------- Server → Client frames ----------
export interface ConnectedFrame {
  type: "connected";
  session_id: string;
  event_id: string;
  heartbeat_interval: number; // 20
  server_version: string; // "v2.0"
  active_task: string | null;
}
export interface PongFrame { type: "pong"; ack_of: string; server_time: string }
export interface AckFrame {
  type: "ack";
  ack_of: string;
  status: "ok" | "error";
  data?: Record<string, unknown>;
  error?: { code: ErrorCode; message: string };
}

export interface Option { option_id: number; text: string }

/** Common envelope for node event frames (question/checkpoint/final/error). */
export interface NodeEventBase {
  event_id: string;
  node_id: string;
  node_seq: number;
  task_id: string;
  timestamp: string;
}
export interface QuestionPayload {
  clarify_id: string;
  question: string;
  message: string; // markdown — recommendation + reasoning
  options: Option[]; // option_id 0 is always "其他/自定义"
  default_option: Option;
  expected_input: "answer";
  expected_tool: "gdf_answer";
  node_id: string;
  node_index: number;
  node_name: string;
  node_seq: number;
  stage_label: string;
  total_nodes: number; // 11
  timeout_sec: number; // 600
  expires_at: string;
  last_message: string;
}
export interface CheckpointPayload {
  checkpoint_id: string;
  sub_checkpoint_id?: string;
  title: string;
  message: string;
  preview: { format: "markdown"; text: string };
  options: Option[];
  default_option: Option;
  expected_input: "checkpoint_decision";
  expected_tool: "gdf_checkpoint_decision";
  stage: string;
  stage_label: string;
  node_id: string;
  node_index: number;
  node_name: string;
  node_seq: number;
  total_nodes: number;
  timeout_sec: number;
  expires_at: string;
  last_message: string;
}
export interface FinalPayload {
  command: Command;
  final_result: { content: { format: "markdown"; text: string } };
  expected_input: "none";
}
export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  status: "failed";
  expected_input: "none";
}
export interface QuestionFrame extends NodeEventBase { type: "question"; payload: QuestionPayload }
export interface QuestionTimeoutFrame extends NodeEventBase { type: "question_timeout"; payload: QuestionPayload }
export interface CheckpointFrame extends NodeEventBase { type: "checkpoint"; payload: CheckpointPayload }
export interface CheckpointTimeoutFrame extends NodeEventBase { type: "checkpoint_timeout"; payload: CheckpointPayload }
export interface FinalFrame extends NodeEventBase { type: "final"; payload: FinalPayload }
export interface ErrorFrame extends NodeEventBase { type: "error"; payload: ErrorPayload }

export type ServerFrame =
  | ConnectedFrame | PongFrame | AckFrame
  | QuestionFrame | QuestionTimeoutFrame
  | CheckpointFrame | CheckpointTimeoutFrame
  | FinalFrame | ErrorFrame;

// ---------- Error codes / business rules ----------
export type ErrorCode =
  | "SESSION_NOT_FOUND"
  | "USER_CONCURRENT_LIMIT"
  | "IDLE_TIMEOUT_CANCELLED"
  | "INTERNAL_ERROR";

export const LIMITS = {
  USER_CONCURRENT_TASKS: 2,
  IDLE_TIMEOUT_SEC: 600,
  HEARTBEAT_SEC: 20,
  TOTAL_NODES: 11,
} as const;

/** option_id 0 is always the free-text "其他/自定义" choice. */
export const CUSTOM_OPTION_ID = 0;
