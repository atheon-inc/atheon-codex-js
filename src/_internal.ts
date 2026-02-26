import {
    APIException,
    BadRequestException,
    ForbiddenException,
    InternalServerErrorException,
    NotFoundException,
    RateLimitException,
    UnauthorizedException,
    UnprocessableEntityException,
} from "./exceptions";

function _handleCommon3xx4xx5xxStatusCode(
    statusCode: number,
    responseText: string,
): never {
    switch (statusCode) {
        case 400:
            throw new BadRequestException(`Bad Request: ${responseText}`);
        case 401:
            throw new UnauthorizedException(`Unauthorized: ${responseText}`);
        case 403:
            throw new ForbiddenException(`Forbidden: ${responseText}`);
        case 404:
            throw new NotFoundException(`Not Found: ${responseText}`);
        case 422:
            throw new UnprocessableEntityException(
                `Unprocessable Entity: ${responseText}`,
            );
        case 429:
            throw new RateLimitException(
                `Rate Limit Exceeded: ${responseText}`,
            );
        case 500:
            throw new InternalServerErrorException(
                `Internal Server Error: ${responseText}`,
            );
        default:
            throw new APIException(
                statusCode,
                `Unexpected Error: ${responseText}`,
            );
    }
}

export async function _handleResponse(
    response: Response,
    isStreamingRequest: boolean = false,
) {
    switch (response.status) {
        case 200:
        case 201:
        case 202:
            if (isStreamingRequest) {
                if (response.body) {
                    const decoder = new TextDecoder();
                    let buffer = "";

                    for await (const chunk of response.body) {
                        buffer += decoder.decode(chunk, { stream: true });
                        const lines = buffer.split(/\r\n|\n|\r/);
                        buffer = lines.pop() || "";

                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                return JSON.parse(
                                    line.substring("data: ".length).trim(),
                                );
                            } else if (line.startsWith("error: ")) {
                                throw new InternalServerErrorException(
                                    line.substring("error: ".length).trim(),
                                );
                            }
                        }
                    }

                    throw new APIException(
                        500,
                        "Stream ended without a valid event.",
                    );
                } else {
                    throw new APIException(
                        500,
                        "Streaming response body is null.",
                    );
                }
            } else {
                return await response.json();
            }
        default:
            const responseText = await response.text();
            _handleCommon3xx4xx5xxStatusCode(response.status, responseText);
    }
}
