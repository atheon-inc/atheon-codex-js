import { randomUUID } from "node:crypto";

export interface ToolRecord {
  id: string;
  type: "tool";
  name: string;
  latency_ms: string;
  error?: string;
}

export interface AgentRecord {
  id: string;
  type: "agent";
  name: string;
  provider: string;
  model_name: string;
  tokens_input?: number;
  tokens_output?: number;
  finish_reason?: string;
  status_code?: number;
  latency_ms?: string;
  tools_used: (ToolRecord | AgentRecord)[];
  error?: string;
  properties: Record<string, unknown>;
}

export interface AtheonTrackPayload {
  interaction_id: string;
  provider: string;
  model_name: string;
  input?: string;
  output?: string;
  prompt_hash?: string;
  tokens_input?: number;
  tokens_output?: number;
  finish_reason?: string;
  status_code?: number;
  latency_ms?: string;
  tools_used: (ToolRecord | AgentRecord)[];
  conversation_id?: string;
  properties: Record<string, unknown>;
}

export function buildToolRecord(
  name: string,
  latencyMs: number,
  error?: string,
): ToolRecord {
  return {
    id: randomUUID(),
    type: "tool",
    name,
    latency_ms: latencyMs.toFixed(2),
    error,
  };
}

export function buildAgentRecord(opts: {
  agentName: string;
  provider: string;
  modelName: string;
  tokensInput?: number;
  tokensOutput?: number;
  finishReason?: string;
  latencyMs: number;
  toolsUsed: (ToolRecord | AgentRecord)[];
  error?: string;
  properties: Record<string, unknown>;
}): AgentRecord {
  return {
    id: randomUUID(),
    type: "agent",
    name: opts.agentName,
    provider: opts.provider,
    model_name: opts.modelName,
    tokens_input: opts.tokensInput,
    tokens_output: opts.tokensOutput,
    finish_reason: opts.finishReason,
    latency_ms: opts.latencyMs.toFixed(2),
    tools_used: opts.toolsUsed,
    error: opts.error,
    properties: opts.properties,
  };
}

export function buildTrackPayload(opts: {
  interactionId?: string;
  provider: string;
  modelName: string;
  input?: string;
  output?: string;
  promptHash?: string;
  tokensInput?: number;
  tokensOutput?: number;
  finishReason?: string;
  latencyMs?: number;
  toolsUsed: (ToolRecord | AgentRecord)[];
  conversationId?: string;
  properties: Record<string, unknown>;
}): AtheonTrackPayload {
  return {
    interaction_id: opts.interactionId ?? randomUUID(),
    provider: opts.provider,
    model_name: opts.modelName,
    input: opts.input,
    output: opts.output,
    prompt_hash: opts.promptHash,
    tokens_input: opts.tokensInput,
    tokens_output: opts.tokensOutput,
    finish_reason: opts.finishReason,
    latency_ms:
      opts.latencyMs !== undefined ? opts.latencyMs.toFixed(2) : undefined,
    tools_used: opts.toolsUsed,
    conversation_id: opts.conversationId,
    properties: opts.properties,
  };
}
