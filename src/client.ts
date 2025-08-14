import { APIException } from "./exceptions";
import { _handleResponse } from "./_internal";
import type { AdUnitsFetchModel, AdUnitsIntegrateModel } from "./models";

export interface AtheonCodexClientOptions {
    apiKey: string;
    baseUrl?: string;
    headers?: Record<string, string>;
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
        timeout: number = 15000
    ): Promise<any> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = { ...this.headers };
        const options: RequestInit = {
            ...this.kwargs,
            method,
            headers: headers,
            signal: AbortSignal.timeout(timeout),
        };

        if (isStreamingRequest) {
            if (method !== "GET") {
                throw new APIException(
                    400,
                    "Streaming requests only support the GET method."
                );
            }
            headers["Accept"] = "text/event-stream";
        } else if (jsonPayload) {
            options.body = JSON.stringify(jsonPayload);
        }

        const response = await fetch(url, options);
        return await _handleResponse(response, isStreamingRequest);
    }

    public async fetchAdUnits(payload: AdUnitsFetchModel): Promise<any> {
        const response = await this._makeRequest(
            "POST",
            "/ad-units/fetch",
            payload,
            false
        );

        const taskId = response.message?.task_id;
        if (!taskId) {
            throw new APIException(
                500,
                "Could not retrieve task_id from initial response."
            );
        }

        return this._makeRequest(
            "GET",
            `/ad-units/fetch/response/${taskId}`,
            undefined,
            true
        );
    }

    public async integrateAdUnits(
        payload: AdUnitsIntegrateModel
    ): Promise<any> {
        const response = await this._makeRequest(
            "POST",
            "/ad-units/integrate",
            payload,
            false
        );

        const taskId = response.message?.task_id;
        if (!taskId) {
            throw new APIException(
                500,
                "Could not retrieve task_id from initial response."
            );
        }

        return this._makeRequest(
            "GET",
            `/ad-units/integrate/response/${taskId}`,
            undefined,
            true
        );
    }
}
