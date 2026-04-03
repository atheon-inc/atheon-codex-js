import { fernetEncrypt } from "./fernet";
import { handleResponse } from "./internals";
import { Interaction, InteractionContext } from "./interactions";
import { buildTrackPayload, type AgentRecord, type ToolRecord } from "./models";
import { EventQueue } from "./queue";
import { generateHash, isErr } from "./utils";
import { InternalServerErrorException, RateLimitException } from "./exceptions";

/** Configuration options for {@link AtheonCodexClient}. */
export interface AtheonCodexClientOptions {
  /** Atheon project API key. */
  apiKey: string;
  /** Overrides the default gateway endpoint. */
  baseUrl?: string;
  /** Events per HTTP batch. Defaults to `10`. */
  uploadSize?: number;
  /** Seconds between background flushes. Defaults to `1.0`. */
  uploadInterval?: number;
  /** Maximum in-memory queue depth before events are dropped. Defaults to `10_000`. */
  maxQueueSize?: number;
  /** HTTP request timeout in milliseconds. Defaults to `45_000`. */
  requestTimeoutMs?: number;
  /** Additional headers forwarded on every request. */
  extraHeaders?: Record<string, string>;
}

/**
 * Core SDK client. Manages the event queue, signing handshake, and all
 * tracking methods. Always construct via {@link AtheonCodexClient.create}.
 */
export class AtheonCodexClient {
  readonly baseUrl: string;

  private readonly apiKey: string;
  private readonly requestTimeoutMs: number;
  private readonly extraHeaders: Record<string, string>;
  private readonly queue: EventQueue;

  private fernetKey?: string;
  private envContext?: string;

  private constructor(opts: AtheonCodexClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://api.atheon.ad/v1").replace(
      /\/+$/,
      "",
    );
    this.requestTimeoutMs = opts.requestTimeoutMs ?? 45_000;
    this.extraHeaders = opts.extraHeaders ?? {};

    this.queue = new EventQueue({
      sendFn: (batch) => this.sendBatch(batch),
      uploadSize: opts.uploadSize,
      uploadInterval: opts.uploadInterval,
      maxQueueSize: opts.maxQueueSize,
    });
  }

  /**
   * Creates and initialises a client, completing the signing handshake
   * before resolving.
   *
   * @example
   * ```ts
   * const client = await AtheonCodexClient.create({ apiKey: process.env.ATHEON_API_KEY! });
   * ```
   */
  static async create(
    opts: AtheonCodexClientOptions,
  ): Promise<AtheonCodexClient> {
    const client = new AtheonCodexClient(opts);
    const ok = await client.initializeSigning();
    if (!ok) throw new Error("Failed to complete cryptographic handshake.");
    return client;
  }

  async flush(): Promise<void> {
    await this.queue.flush();
  }

  async shutdown(): Promise<void> {
    await this.queue.shutdown();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.shutdown();
  }

  private async initializeSigning(): Promise<boolean> {
    function isRetryableError(err: unknown): boolean {
      return (
        err instanceof RateLimitException ||
        err instanceof InternalServerErrorException ||
        (err instanceof TypeError && err.message === "fetch failed")
      );
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await this.request("/track-ai-events/signing-secret", {
          method: "GET",
        });
        const result = await handleResponse(response);

        if (isErr(result)) {
          const isRetryable = isRetryableError(result.error);

          if (isRetryable && attempt < 2) {
            await new Promise((r) => setTimeout(r, 200 * 2 ** attempt));
            continue;
          }

          console.error(
            "[atheon-codex] Security handshake failed:",
            result.error.message,
          );
          return false;
        }

        this.fernetKey = result.value["signing_secret"] as string;
        this.envContext = result.value["env_context"] as string;
        return true;
      } catch (err) {
        const isRetryable = isRetryableError(err);

        if (isRetryable && attempt < 2) {
          await new Promise((r) => setTimeout(r, 200 * 2 ** attempt));
          continue;
        }

        console.error(
          "[atheon-codex] Security handshake failed after retry:",
          err,
        );
        return false;
      }
    }
    return false;
  }

  /**
   * Tracks a complete single-turn interaction immediately.
   *
   * Use {@link begin} when you need wall-clock timing, mid-flight property
   * updates, or `tool`/`agent` context propagation.
   *
   * @returns A tuple of `[interactionId, promptHash, signedToken]`.
   *   `signedToken` is `undefined` if the signing handshake has not completed.
   * @throws If neither `input` nor `output` is provided.
   */
  track(opts: {
    provider: string;
    modelName: string;
    input?: string;
    output?: string;
    tokensInput?: number;
    tokensOutput?: number;
    finishReason?: string;
    latencyMs?: number;
    toolsUsed?: (ToolRecord | AgentRecord)[];
    conversationId?: string;
    properties?: Record<string, unknown>;
  }): [string, string, string | undefined] {
    if (!opts.input && !opts.output) {
      throw new Error(
        '[atheon-codex] Either "input" or "output" must be provided to track().',
      );
    }

    const payload = buildTrackPayload({
      provider: opts.provider,
      modelName: opts.modelName,
      input: opts.input,
      output: opts.output,
      promptHash: generateHash(opts.input),
      tokensInput: opts.tokensInput,
      tokensOutput: opts.tokensOutput,
      finishReason: opts.finishReason,
      latencyMs: opts.latencyMs,
      toolsUsed: opts.toolsUsed ?? [],
      conversationId: opts.conversationId,
      properties: opts.properties ?? {},
    });

    this.queue.enqueue(JSON.parse(JSON.stringify(payload)));

    return [
      payload.interaction_id,
      payload.prompt_hash ?? "",
      this.signInteractionId(payload.interaction_id),
    ];
  }

  /**
   * Begins a timed interaction.
   *
   * Returns an `Interaction` handle and an opaque `InteractionContext` token.
   * Pass the token to {@link contextWith} to propagate context through
   * `tool` and `agent` wrappers.
   *
   * @example
   * ```ts
   * const [interaction, ctx] = client.begin({ provider: "openai", modelName: "gpt-4o", input });
   * const output = await atheon.contextWith(ctx, () => myRagPipeline(input));
   * interaction.setProperty("userId", req.user.id);
   * const [id, hash, token] = interaction.finish({ output });
   * ```
   */
  begin(opts: {
    provider: string;
    modelName: string;
    input?: string;
    conversationId?: string;
    properties?: Record<string, unknown>;
  }): [Interaction, InteractionContext] {
    const interaction = new Interaction({
      provider: opts.provider,
      modelName: opts.modelName,
      input: opts.input,
      conversationId: opts.conversationId,
      properties: opts.properties,
      queue: this.queue,
      signFn: (id) => this.signInteractionId(id),
    });

    return [interaction, interaction as unknown as InteractionContext];
  }

  private signInteractionId(interactionId: string): string | undefined {
    if (!this.fernetKey) return undefined;

    const payload = JSON.stringify({
      interaction_id: interactionId,
      env_context: this.envContext,
    });

    return fernetEncrypt(this.fernetKey, payload);
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      return await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          "x-atheon-api-key": this.apiKey,
          "Content-Type": "application/json",
          ...this.extraHeaders,
          ...(init.headers as Record<string, string> | undefined),
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async sendBatch(batch: Record<string, unknown>[]): Promise<void> {
    const response = await this.request("/track-ai-events/", {
      method: "POST",
      body: JSON.stringify({ events: batch }),
    });

    const result = await handleResponse(response);
    if (isErr(result)) {
      throw result.error;
    }
  }
}
