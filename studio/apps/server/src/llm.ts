// Claude integration (bring-your-own API key). Structured output via a single
// forced tool call — robust across SDK versions (no output_config/parse needed).
import Anthropic from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodType } from "zod";
import { NextStepSchema, SectionSchema, ReviewSchema, ValidationReportSchema } from "@gdf/shared";
import type { NextStep, SectionOutput, ReviewOutput, ValidationReport } from "@gdf/shared";
import { mockNextStep, mockGenerateSections, mockReview, mockValidate } from "./mock.js";

export const DEFAULT_MODEL = "claude-opus-4-8";

export function makeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

interface Call { client: Anthropic; model: string; system: string; user: string }

function toInputSchema(schema: ZodType): Record<string, unknown> {
  const js = zodToJsonSchema(schema, { target: "openApi3" }) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

async function structured<T>(
  { client, model, system, user }: Call,
  schema: ZodType<T>,
  toolName: string,
  maxTokens: number
): Promise<T> {
  const resp = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    tools: [{ name: toolName, description: `Return the result as ${toolName}.`, input_schema: toInputSchema(schema) as any }],
    tool_choice: { type: "tool", name: toolName },
    messages: [{ role: "user", content: user }],
  });
  const block = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!block) throw new Error(`${toolName}: no tool_use block (stop_reason=${resp.stop_reason})`);
  return schema.parse(block.input);
}

export function nextStep(call: Call): Promise<NextStep> {
  if (process.env.GDF_MOCK === "1") return mockNextStep(call);
  return structured(call, NextStepSchema, "next_step", 8000);
}
export function generateSections(call: Call): Promise<SectionOutput> {
  if (process.env.GDF_MOCK === "1") return mockGenerateSections(call);
  return structured(call, SectionSchema, "sections", 16000);
}
export function review(call: Call): Promise<ReviewOutput> {
  if (process.env.GDF_MOCK === "1") return mockReview(call);
  return structured(call, ReviewSchema, "review", 16000);
}
export function validateNumbers(call: Call): Promise<ValidationReport> {
  if (process.env.GDF_MOCK === "1") return mockValidate(call);
  return structured(call, ValidationReportSchema, "validation_report", 8000);
}
