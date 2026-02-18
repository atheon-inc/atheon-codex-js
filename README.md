## Legacy Notice – February 2026

This snapshot (`legacy-archive-1`) preserves the original **Ads in LLM** codebase prior to our strategic refocus in February 2026.

### The Strategic Pivot

After a year in the market, we successfully validated our core technology and saw promising early traction. However, **we** realized that widespread user readiness for ad-integrated AI experiences is still evolving. During this period, we observed that our users were primarily utilizing **Atheon** as an analytics suite to understand AI traffic patterns.

To meet this immediate market demand, we have shifted our primary focus to **Analytics for AI Traffic**. This allows us to provide high-value tooling for developers today, while maintaining the underlying architecture to re-enable **the** ad-tech as the ecosystem matures.

### What This Means

* **Status:** This is a permanent, read-only snapshot of the codebase as of February 2026.
* **Purpose:** Preserved for historical reference, audit trails, and future retrieval of ad-serving logic.
* **Active Development:** All current work on the Atheon Analytics platform is located on the `main` branch.

*We are incredibly proud of the groundwork established here; it remains the technical foundation for everything we are building next.*

---

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
