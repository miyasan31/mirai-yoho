import { DomainError } from "@mirai-yoho/shared/domain-error";
import { AppError } from "@/application/shared/app-error";
import { AuthError } from "@/infrastructure/auth/verify-auth";

interface ApiErrorResponse {
  status: number;
  code: string;
  message: string;
}

interface PostErrorLogContext {
  endpoint: string;
  organizationId: string;
  segments: string[];
}

export function mapApiError(error: unknown): ApiErrorResponse {
  if (error instanceof AuthError) {
    return {
      status: error.statusCode,
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof DomainError) {
    return {
      status: 400,
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      code: error.code,
      message: error.message,
    };
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Internal server error",
  };
}

export function logUnexpectedPostError(
  error: unknown,
  context: PostErrorLogContext,
): void {
  if (
    error instanceof AuthError ||
    error instanceof DomainError ||
    error instanceof AppError
  ) {
    return;
  }

  console.error("Unhandled POST /organizations API error", {
    endpoint: context.endpoint,
    organizationId: context.organizationId,
    segments: context.segments,
    error,
  });
}
