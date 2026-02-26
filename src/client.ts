import { APIException } from "./exceptions";
import { _handleResponse } from "./_internal";
import type { AtheonUnitCreateModel } from "./models";

export interface AtheonCodexClientOptions {
    apiKey: string;
    baseUrl?: string;
    headers?: Record<string, string>;

    /**
     * Supported special keys:
     * - `params`: Record<string, any> - Merged with URL query parameters.
     * - `cookies`: Record<string, string> - Added to the 'Cookie' header.
     * - `headers`: Record<string, string> - Merged with request headers.
     * - `timeout`: number - Request timeout in milliseconds (overrides default).
     *
     * All other keys (e.g., `mode`, `credentials`) are passed directly to `fetch`.
     */
    kwargs?: Record<string, any>;
}

export class AtheonCodexClient {
    private readonly baseUrl: string;
    private readonly headers: Record<string, string>;
    private readonly kwargs: Record<string, any>;

    constructor(options: AtheonCodexClientOptions) {
        this.baseUrl = options.baseUrl || "https://api.atheon.ad/v1";
        this.headers = {
            "x-atheon-api-key": options.apiKey,
            "Content-Type": "application/json",
            ...options.headers,
        };
        this.kwargs = options.kwargs || {};
    }

    private async _makeRequest(
        method: "GET" | "POST" | "PUT" | "DELETE",
        endpoint: string,
        jsonPayload?: Record<string, any>,
        isStreamingRequest: boolean = false,
        defaultTimeout: number = 45000,
    ): Promise<any> {
        const {
            params: kwargsParams,
            cookies: kwargsCookies,
            headers: kwargsHeaders,
            timeout: kwargsTimeout,
            ...fetchOptions
        } = this.kwargs;

        const urlObj = new URL(`${this.baseUrl}${endpoint}`);
        if (kwargsParams) {
            Object.entries(kwargsParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    urlObj.searchParams.append(key, String(value));
                }
            });
        }
        const url = urlObj.toString();

        const headers: Record<string, string> = { ...this.headers };
        if (kwargsHeaders) {
            Object.assign(headers, kwargsHeaders);
        }

        if (kwargsCookies) {
            const cookieString = Object.entries(kwargsCookies)
                .map(([k, v]) => `${k}=${v}`)
                .join("; ");

            if (headers["Cookie"]) {
                headers["Cookie"] += `; ${cookieString}`;
            } else {
                headers["Cookie"] = cookieString;
            }
        }

        const timeout =
            typeof kwargsTimeout === "number" ? kwargsTimeout : defaultTimeout;

        const options: RequestInit = {
            ...fetchOptions, // Pass through standard fetch options (mode, cache, etc.)
            method,
            headers: headers,
            signal: AbortSignal.timeout(timeout),
        };

        if (isStreamingRequest) {
            if (method !== "GET") {
                throw new APIException(
                    400,
                    "Streaming requests only support the GET method.",
                );
            }
            headers["Accept"] = "text/event-stream";
        } else if (jsonPayload) {
            options.body = JSON.stringify(jsonPayload);
        }

        const response = await fetch(url, options);
        return await _handleResponse(response, isStreamingRequest);
    }

    public async createAtheonUnit(
        payload: AtheonUnitCreateModel,
    ): Promise<any> {
        const response = await this._makeRequest(
            "POST",
            "/track-units/create",
            payload,
            false,
        );

        return response;
    }
}
