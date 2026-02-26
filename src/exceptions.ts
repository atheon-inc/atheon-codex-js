export class APIException extends Error {
    constructor(
        public status: number,
        public detail?: string,
    ) {
        super(detail || `Request failed with status ${status}`);
        this.name = "APIException";
    }
}

export class BadRequestException extends APIException {
    constructor(detail?: string) {
        super(400, detail || "Bad Request");
        this.name = "BadRequestException";
    }
}

export class UnauthorizedException extends APIException {
    constructor(detail?: string) {
        super(401, detail || "Unauthorized");
        this.name = "UnauthorizedException";
    }
}

export class ForbiddenException extends APIException {
    constructor(detail?: string) {
        super(403, detail || "Forbidden");
        this.name = "ForbiddenException";
    }
}

export class NotFoundException extends APIException {
    constructor(detail?: string) {
        super(404, detail || "Not Found");
        this.name = "NotFoundException";
    }
}

export class UnprocessableEntityException extends APIException {
    constructor(detail?: string) {
        super(422, detail || "Unprocessable Entity");
        this.name = "UnprocessableEntityException";
    }
}

export class RateLimitException extends APIException {
    constructor(detail?: string) {
        super(429, detail || "Rate Limit Exceeded");
        this.name = "RateLimitException";
    }
}

export class InternalServerErrorException extends APIException {
    constructor(detail?: string) {
        super(500, detail || "Internal Server Error");
        this.name = "InternalServerErrorException";
    }
}
