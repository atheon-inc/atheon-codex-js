/**
 * Atheon Codex SDK for Node.js
 *
 * @example
 * ```ts
 * import * as atheon from "@atheon-inc/codex";
 *
 * await atheon.init({ apiKey: "..." });
 *
 * const [interaction, ctx] = atheon.begin({ provider: "openai", modelName: "gpt-4" });
 * const response = await atheon.contextWith(ctx, async () => {
 *     return await myRagPipeline();
 * });
 *
 * interaction.setProperty("ragResponse", response);
 * interaction.finish();
 * ```
 */

export const __version__ = "1.0.2";

export type { AtheonCodexClientOptions } from "./client";
export { AtheonCodexClient } from "./client";

export { agent, setResult, tool } from "./hof_wrappers";

export { getActiveInteraction, contextWith } from "./interactions";
export type {
  Interaction,
  ChildInteraction,
  InteractionContext,
} from "./interactions";

export type { AgentRecord, AtheonTrackPayload, ToolRecord } from "./models";

export {
  APIException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  RateLimitException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "./exceptions";

import { AtheonCodexClient, type AtheonCodexClientOptions } from "./client";
import type { Interaction, InteractionContext } from "./interactions";

let globalClient: AtheonCodexClient | undefined;

function getClient(): AtheonCodexClient {
  if (globalClient === undefined) {
    throw new Error(
      "[atheon-codex] Client not initialised. Call atheon.init({ apiKey }) before tracking.",
    );
  }
  return globalClient;
}

/**
 * Initialises the global Atheon client. Call once at application startup.
 * Subsequent calls are a no-op and return the existing client.
 *
 * @example
 * ```ts
 * await atheon.init({ apiKey: process.env.ATHEON_API_KEY! });
 * ```
 */
export async function init(
  opts: AtheonCodexClientOptions,
): Promise<AtheonCodexClient> {
  if (globalClient !== undefined) return globalClient;

  globalClient = await AtheonCodexClient.create(opts);
  return globalClient;
}

/** Tracks a complete single-turn interaction (fire-and-forget). Requires {@link init}. */
export function track(
  opts: Parameters<AtheonCodexClient["track"]>[0],
): ReturnType<AtheonCodexClient["track"]> {
  return getClient().track(opts);
}

/** Begins a streaming or multi-turn interaction. Requires {@link init}. */
export function begin(
  opts: Parameters<AtheonCodexClient["begin"]>[0],
): [Interaction, InteractionContext] {
  return getClient().begin(opts);
}

/** Waits for all pending events to be delivered. */
export async function flush(): Promise<void> {
  await getClient().flush();
}

/** Flush pending events and shut down the global client. */
export async function shutdown(): Promise<void> {
  if (globalClient !== undefined) {
    await globalClient.shutdown();
    globalClient = undefined;
  }
}
