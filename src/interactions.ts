import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import {
  type AgentRecord,
  type ToolRecord,
  buildAgentRecord,
  buildTrackPayload,
} from "./models";
import type { EventQueue } from "./queue";
import { generateHash } from "./utils";

export const interactionStorage = new AsyncLocalStorage<
  Interaction | ChildInteraction | undefined
>();

/** Returns the nearest active `Interaction` or `ChildInteraction`, or `undefined`. */
export function getActiveInteraction():
  | Interaction
  | ChildInteraction
  | undefined {
  return interactionStorage.getStore();
}

export type InteractionContext = {
  readonly interactionBrand: unique symbol;
};

/**
 * Runs `fn` inside an isolated async context where `tool` and `agent`
 * wrappers automatically attach to the given interaction.
 *
 * Safe for concurrent workloads.
 *
 * @returns The return value of `fn`.
 */
export function contextWith<T>(
  ctx: InteractionContext,
  fn: () => Promise<T>,
): Promise<T> {
  return interactionStorage.run(ctx as unknown as Interaction, fn);
}

abstract class BaseInteraction {
  readonly interactionId: string;
  readonly provider: string;
  readonly modelName: string;
  readonly properties: Record<string, unknown>;
  readonly toolsUsed: (ToolRecord | AgentRecord)[] = [];

  protected finished = false;
  protected readonly startTime: number;

  constructor(
    provider: string,
    modelName: string,
    properties?: Record<string, unknown>,
  ) {
    this.interactionId = randomUUID();
    this.provider = provider;
    this.modelName = modelName;
    this.properties = properties ? { ...properties } : {};
    this.startTime = performance.now();
  }

  protected get elapsedMs(): number {
    return performance.now() - this.startTime;
  }

  addToolExecution(record: ToolRecord): void {
    this.toolsUsed.push(record);
  }

  addAgentExecution(record: AgentRecord): void {
    this.toolsUsed.push(record);
  }

  setProperty(key: string, value: unknown): void {
    this.properties[key] = value;
  }
}

/**
 * A root interaction representing the top-level LLM call.
 * Obtained via {@link AtheonCodexClient.begin}.
 */
export class Interaction extends BaseInteraction {
  readonly input?: string;
  readonly conversationId?: string;

  private readonly queue: EventQueue;
  private readonly signFn: (id: string) => string | undefined;

  constructor(opts: {
    provider: string;
    modelName: string;
    input?: string;
    conversationId?: string;
    properties?: Record<string, unknown>;
    queue: EventQueue;
    signFn: (id: string) => string | undefined;
  }) {
    super(opts.provider, opts.modelName, opts.properties);
    this.input = opts.input;
    this.conversationId = opts.conversationId;
    this.queue = opts.queue;
    this.signFn = opts.signFn;
  }

  get isChildInteraction(): false {
    return false;
  }

  /**
   * Completes the interaction and enqueues the full payload for delivery.
   * Idempotent — subsequent calls log a warning and return early.
   *
   * @returns A tuple of `[interactionId, promptHash, signedToken]`.
   */
  finish(
    opts: {
      output?: string;
      tokensInput?: number;
      tokensOutput?: number;
      finishReason?: string;
    } = {},
  ): [string, string, string | undefined] {
    if (this.finished) {
      console.warn(
        `[atheon-codex] finish() called more than once on interaction ${this.interactionId}.`,
      );
      return [this.interactionId, generateHash(this.input), undefined];
    }

    this.finished = true;
    const latencyMs = this.elapsedMs;

    const payload = buildTrackPayload({
      interactionId: this.interactionId,
      provider: this.provider,
      modelName: this.modelName,
      input: this.input,
      output: opts.output,
      promptHash: generateHash(this.input),
      tokensInput: opts.tokensInput,
      tokensOutput: opts.tokensOutput,
      finishReason: opts.finishReason,
      latencyMs,
      toolsUsed: this.toolsUsed,
      conversationId: this.conversationId,
      properties: this.properties,
    });

    this.queue.enqueue(JSON.parse(JSON.stringify(payload)));

    return [
      payload.interaction_id,
      payload.prompt_hash ?? "",
      this.signFn(payload.interaction_id),
    ];
  }
}

/**
 * A sub-agent interaction, created automatically by {@link agent}.
 *
 * Nested `tool` calls attach here instead of the root. On completion,
 * an `AgentRecord` is written to the parent's `toolsUsed`.
 */
export class ChildInteraction extends BaseInteraction {
  readonly agentName: string;
  readonly parent: Interaction | ChildInteraction;

  private tokensInput?: number;
  private tokensOutput?: number;
  private finishReason?: string;

  constructor(opts: {
    agentName: string;
    parent: Interaction | ChildInteraction;
    provider: string;
    modelName: string;
    properties?: Record<string, unknown>;
  }) {
    super(opts.provider, opts.modelName, opts.properties);
    this.agentName = opts.agentName;
    this.parent = opts.parent;
  }

  get isChildInteraction(): true {
    return true;
  }

  setMetrics(opts: {
    tokensInput?: number;
    tokensOutput?: number;
    finishReason?: string;
  }): void {
    if (opts.tokensInput !== undefined) this.tokensInput = opts.tokensInput;
    if (opts.tokensOutput !== undefined) this.tokensOutput = opts.tokensOutput;
    if (opts.finishReason !== undefined) this.finishReason = opts.finishReason;
  }

  finishAgent(error?: string): void {
    if (this.finished) return;

    this.finished = true;
    const latencyMs = this.elapsedMs;

    const record = buildAgentRecord({
      agentName: this.agentName,
      provider: this.provider,
      modelName: this.modelName,
      tokensInput: this.tokensInput,
      tokensOutput: this.tokensOutput,
      finishReason: this.finishReason,
      latencyMs,
      toolsUsed: this.toolsUsed,
      error,
      properties: this.properties,
    });

    this.parent.addAgentExecution(record);
  }
}
