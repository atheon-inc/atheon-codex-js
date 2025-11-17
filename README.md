# Codex: Javascript SDK for Atheon

The Atheon Codex Javascript library provides convenient access to the Atheon Gateway Ad Service from JavaScript and TypeScript environments. The library includes type definitions, supports modern module systems (ESM & CommonJS), and offers both promise-based and async/await-friendly APIs.

## Installation

```sh
# install atheon-codex SDK
npm install @atheon-inc/codex
# or
yarn add @atheon-inc/codex
```

## Usage

```javascript
import { AtheonCodexClient } from "@atheon-inc/codex";

async function main() {
    // Initialize client
    const client = new AtheonCodexClient({
        apiKey: process.env.ATHEON_CODEX_API_KEY,
    });

    // Fetch and Integrate atheon unit
    let content = "";
    try {
        const fetchAndIntegrationResponse = await client.fetchAndIntegrateAtheonUnit({
            query: "Your user prompt/ad query goes here.",
            baseContent: "insert the llm response generated from your application as the base content",
            // use_user_intent_as_filter: true
        });
        content =
            fetchAndIntegrationResponse?.response_data?.integrated_content ?? null;
    } catch (err) {
        console.error("Error fetching and integrating atheon unit:", err);
    }

    console.log("Content with Atheon Unit:", content);

main();
```

>> **Note:** _You can enable monetization through [Atheon Gateway Dashboard](https://gateway.atheon.ad) under project settings._


While you can provide an `apiKey` keyword argument, we recommend using [dotenv](https://github.com/motdotla/dotenv) (or something similar) to add `ATHEON_CODEX_API_KEY="My Eon API Key"` to your `.env` file so that your API Key is not stored in source control.

## License

This SDK is licensed under the **Apache License 2.0**. See [LICENSE.md](LICENSE.md) for details.