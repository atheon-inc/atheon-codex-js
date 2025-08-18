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

    // Fetch ad units
    let adUnitIds = [];
    try {
        const fetchResponse = await client.fetchAdUnits({
            query: "Your user prompt/ad query goes here.",
        });
        adUnitIds = (fetchResponse?.response_data ?? []).map(
            (adUnit) => adUnit?.id
        );
    } catch (err) {
        console.error("Error fetching ad units:", err);
        return;
    }

    // Integrate ad units
    let integratedContent = "";
    try {
        const integrationResponse = await client.integrateAdUnits({
            ad_unit_ids: adUnitIds,
            baseContent:
                "insert the llm response generated from your application as the base content",
        });
        integratedContent =
            integrationResponse?.response_data?.integrated_content ?? null;
    } catch (err) {
        console.error("Error integrating ad units:", err);
    }

    console.log("Integrated Content:", integratedContent);
}

main();
```

While you can provide an `apiKey` keyword argument, we recommend using [dotenv](https://github.com/motdotla/dotenv) (or something similar) to add `ATHEON_CODEX_API_KEY="My Eon API Key"` to your `.env` file so that your API Key is not stored in source control.

## License

This SDK is licensed under the **Apache License 2.0**. See [LICENSE.md](LICENSE.md) for details.