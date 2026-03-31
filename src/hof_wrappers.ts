import { buildToolRecord } from "./models";
import {
  ChildInteraction,
  getActiveInteraction,
  interactionStorage,
} from "./interactions";

/**
 * Wraps a function for automatic tool tracking.
 *
 * Execution time and errors are recorded on the nearest active interaction.
 * Transparently no-ops when called outside an active context.
 *
 * @param name - Logical tool name.
 * @param fn - The function to instrument (sync or async).
 * @returns The instrumented function with an identical signature.
 *
 * @example
 * ```ts
 * const vectorSearch = tool("vector-search", async (query: string) => {
 *   return db.search(query);
 * });
 * ```
 */
export function tool<TArgs extends unknown[], TReturn>(
  name: string,
  fn: (...args: TArgs) => TReturn | Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const active = getActiveInteraction();
    const start = performance.now();
    let errorMsg: string | undefined;

    try {
      return await Promise.resolve(fn(...args));
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      const latencyMs = performance.now() - start;
      if (active !== undefined) {
        active.addToolExecution(buildToolRecord(name, latencyMs, errorMsg));
      }
    }
  };
}

/**
 * Wraps an LLM-backed function as a tracked sub-agent.
 *
 * Creates an isolated `ChildInteraction` so nested `tool` calls attach here
 * rather than the root. On completion, an `AgentRecord` is written to the
 * parent interaction's `toolsUsed`.
 *
 * @param name - Sub-agent name.
 * @param provider - LLM provider (e.g. `"anthropic"`).
 * @param modelName - Model identifier (e.g. `"claude-haiku-4-5"`).
 * @param fn - The function to instrument (sync or async).
 * @returns The instrumented function with an identical signature.
 *
 * @example
 * ```ts
 * const ragAgent = agent(
 *   "rag-pipeline", "anthropic", "claude-haiku-4-5",
 *   async (query: string) => {
 *     const docs = await vectorSearch(query);
 *     const response = await llm.messages.create({ ... });
 *     setResult({ tokensInput: 10, tokensOutput: 20, finishReason: "stop" });
 *     return response.content[0].text;
 *   }
 * );
 * ```
 */
export function agent<TArgs extends unknown[], TReturn>(
  name: string,
  provider: string,
  modelName: string,
  fn: (...args: TArgs) => TReturn | Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const parent = getActiveInteraction();

    if (parent === undefined) {
      console.warn(
        `[atheon-codex] agent("${name}") called with no active root interaction.`,
      );
      return Promise.resolve(fn(...args));
    }

    const child = new ChildInteraction({
      agentName: name,
      parent,
      provider,
      modelName,
    });

    let errorMsg: string | undefined;

    return interactionStorage.run(child, async () => {
      try {
        return await Promise.resolve(fn(...args));
      } catch (e) {
        errorMsg = e instanceof Error ? e.message : String(e);
        throw e;
      } finally {
        child.finish(errorMsg);
      }
    });
  };
}

/**
 * Sets LLM telemetry on the currently active sub-agent.
 *
 * Must be called inside a function wrapped with {@link agent}. For root
 * interactions, pass metrics directly to {@link Interaction.finish}.
 */
export function setResult(opts: {
  tokensInput?: number;
  tokensOutput?: number;
  finishReason?: string;
}): void {
  const active = getActiveInteraction();

  if (active === undefined || !(active instanceof ChildInteraction)) {
    console.warn(
      "[atheon-codex] setResult() called outside of a child interaction — ignoring.",
    );
    return;
  }

  active.setMetrics(opts);
}
