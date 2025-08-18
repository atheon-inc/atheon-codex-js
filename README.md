# Codex: Javascript SDK for Atheon

The Atheon Codex Javascript library provides convenient access to the Atheon Gateway Ad Service from JavaScript and TypeScript environments. The library includes type definitions, supports modern module systems (ESM & CommonJS), and offers both promise-based and async/await-friendly APIs.

## Installation

```sh
# install from NPM registry
npm install atheon-codex-js
```

## Usage

```javascript
import { AtheonCodexClient, FetchAdUnitsPayload, IntegrateAdUnitsPayload } from 'atheon-codex-js';

const client = new AtheonCodexClient({
  apiKey: process.env.ATHEON_CODEX_API_KEY,
});

const fetchPayload = new FetchAdUnitsPayload({ query: "Your ad query here" });
const fetchResult = await client.fetchAdUnits(fetchPayload);

const adUnitIds = fetchResult.responseData.map(({ id }) => id);

const integratePayload = new IntegrateAdUnitsPayload({
  adUnitIds,
  baseContent: "LLM-generated content here"
});
const integrationResult = await client.integrateAdUnits(integratePayload);

console.log(integrationResult);
```

While you can provide an `apiKey` keyword argument, we recommend using [dotenv](https://github.com/motdotla/dotenv) (or something similar) to add `ATHEON_CODEX_API_KEY="My Eon API Key"` to your `.env` file so that your API Key is not stored in source control.

## License

This SDK is licensed under the **Apache License 2.0**. See [LICENSE.md](LICENSE.md) for details.