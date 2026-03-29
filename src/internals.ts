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
import { type Err, type Ok, err, ok } from "./utils";

type ApiResult = Ok<Record<string, unknown>> | Err<APIException>;

function handleCommon3xx4xx5xxStatusCode(
  statusCode: number,
  responseText: string,
): Err<APIException> {
  switch (statusCode) {
    case 400:
      return err(new BadRequestException(`Bad Request: ${responseText}`));
    case 401:
      return err(new UnauthorizedException(`Unauthorized: ${responseText}`));
    case 403:
      return err(new ForbiddenException(`Forbidden: ${responseText}`));
    case 404:
      return err(new NotFoundException(`Not Found: ${responseText}`));
    case 422:
      return err(
        new UnprocessableEntityException(
          `Unprocessable Entity: ${responseText}`,
        ),
      );
    case 429:
      return err(
        new RateLimitException(`Rate Limit Exceeded: ${responseText}`),
      );
    case 500:
      return err(
        new InternalServerErrorException(
          `Internal Server Error: ${responseText}`,
        ),
      );
    default:
      return err(
        new APIException(
          statusCode,
          `Unexpected Error (${statusCode}): ${responseText}`,
        ),
      );
  }
}

export async function handleResponse(response: Response): Promise<ApiResult> {
  if (response.ok) {
    try {
      const json = (await response.json()) as Record<string, unknown>;
      return ok(json);
    } catch {
      return err(
        new APIException(500, "Failed to parse response body as JSON."),
      );
    }
  }

  const body = await response.text().catch(() => "(unreadable body)");
  return handleCommon3xx4xx5xxStatusCode(response.status, body);
}
