# Codex: JavaScript/TypeScript SDK for Atheon

The Atheon Codex JavaScript/TypeScript SDK library provides convenient access to the Atheon Gateway from any JavaScript/TypeScript SDK application. It includes extensive type definitions, supports modern module systems (ESM & CommonJS), and seamlessly tracks LLM interactions, tools, and sub-agents using built-in async context propagation.

## Installation

```sh
# install atheon-codex SDK
npm install @atheon-inc/codex
# or
yarn add @atheon-inc/codex
# or
pnpm add @atheon-inc/codex
```

## Quick Start

```typescript
import * as atheon from "@atheon-inc/codex";

async function main() {
  // Initialise once at application startup
  await atheon.init({ apiKey: process.env.ATHEON_API_KEY! });

  // Track a completed interaction — non-blocking, enqueues in the background
  const [interactionId, promptHash, fingerprint] = atheon.track({
    provider: "openai",
    modelName: "gpt-4o",
    input: "How can I write blogs for my website?",
    output: "Start by identifying your target audience...",
    tokensInput: 18,
    tokensOutput: 120,
    finishReason: "stop",
  });

  // Pass track response to your frontend: <atheon-container interaction-id="..." prompt-hash="..." fingerprint="...">
  console.log(interactionId);
  console.log(promptHash);
  console.log(fingerprint);

  // Flush and stop the background queue before process exit
  await atheon.shutdown();
}

main();
```

> **Note:** Get your API key from the [Atheon Gateway Dashboard](https://gateway.atheon.ad) under Project Settings. We recommend storing it in a `.env` file using [dotenv](https://github.com/motdotla/dotenv) rather than hardcoding it in source.

## Usage

### Initialisation

Call `atheon.init()` **once** at application startup. All subsequent module-level calls share this global client automatically.

```typescript
await atheon.init({
  apiKey: process.env.ATHEON_API_KEY!,
  uploadSize: 10,        // events per HTTP batch (default 10)
  uploadInterval: 1.0,   // seconds between background flushes (default 1.0)
  maxQueueSize: 10_000,  // max in-memory queue depth (default 10 000)
});
```

### Streaming & Multi-Turn: `begin()` / `finish()`

Use `begin()` and `finish()` when the response spans time. Wall-clock latency is measured automatically. Use `contextWith` to automatically bind wrapped tools and agents to this interaction.

```typescript
const [interaction, ctx] = atheon.begin({
  provider: "anthropic",
  modelName: "claude-sonnet-4-5",
  input: "Summarise our Q3 report",
  properties: { agent: "rag-pipeline", environment: "production" },
});

// Run your logic inside contextWith to automatically track nested tools/agents
const finalText = await atheon.contextWith(ctx, async () => {
  // ... stream response, call tools, run sub-agents ...
  return await myComplexLlmLogic();
});

interaction.setProperty("user_tier", "pro"); // enrich mid-flight

const [interactionId, promptHash, signedToken] = interaction.finish({
  output: finalText,
  tokensInput: 80,
  tokensOutput: 220,
  finishReason: "stop",
});
```

### Tool Tracking: `tool`

Wrap any function (sync or async) with `atheon.tool()` to record its name, latency, and errors into the active interaction automatically.

```typescript
const search = atheon.tool("vector-search", async (query: string) => {
  return await db.search(query);
});

const rerank = atheon.tool("reranker", async (docs: string[]) => {
  return await model.rerank(docs);
});
```

> `atheon.tool` is a no-op if called outside an active `atheon.contextWith` block — making it completely safe to use unconditionally across your codebase.

### Sub-Agent Tracking: `agent`

Wrap LLM-backed sub-agent functions to nest their tool calls and token usage inside the root interaction. Use `atheon.setResult()` inside the agent to log token usage and finish reasons. Everything ships in a single payload when the parent `finish()` is called.

```typescript
const ragAgent = atheon.agent(
  "rag-pipeline",
  "anthropic",
  "claude-haiku-4-5",
  async (query: string) => {
    const chunks = await search(query); // automatically attaches to ragAgent
    const response = await llm.messages.create({ /* ... */ });
    
    atheon.setResult({
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
      finishReason: response.stop_reason,
    });
    
    return response.content.text;
  }
);
```

### Direct Client Instantiation

The module-level helpers are recommended for most applications. If you need multiple isolated clients in the same process, you can instantiate the client directly. Note that `AtheonCodexClient.create` is asynchronous because it performs a security handshake on startup.

```typescript
import { AtheonCodexClient } from "@atheon-inc/codex";

const client = await AtheonCodexClient.create({ 
  apiKey: process.env.ATHEON_API_KEY! 
});

const [interactionId] = client.track({
  provider: "openai", 
  modelName: "gpt-4o", 
  input: "...", 
  output: "..."
});

await client.shutdown();
```

## License

This SDK is licensed under the **Apache License 2.0**. See [LICENSE.md](LICENSE.md) for details.

## Links

  - [Atheon Documentation](https://docs.atheon.ad)
  - [Gateway Dashboard](https://gateway.atheon.ad)
  - [npm](https://www.google.com/search?q=https://www.npmjs.com/package/%40atheon-inc/codex)