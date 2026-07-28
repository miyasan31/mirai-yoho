import { DomainError } from "@mirai-yoho/shared/domain-error";
import * as v from "valibot";
import { AppError } from "@/application/shared/app-error";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { verifyCustomerAuth } from "@/infrastructure/auth/verify-customer-auth";
import {
  createLinkGoogleToAnonymousUserUseCase,
  createSignInWithGoogleUseCase,
  createSignupAnonymouslyUseCase,
  createUserRepository,
} from "@/infrastructure/container";
import { withNoStore } from "../cache-control";

const signupBodySchema = v.object({
  displayName: v.pipe(v.string(), v.trim(), v.minLength(1)),
  birthDate: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/)),
  providerUid: v.optional(v.string()),
  primaryEmail: v.optional(v.pipe(v.string(), v.trim(), v.email())),
  phoneNumber: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))),
});

function jsonError(statusCode: number, code: string, message: string) {
  return withNoStore(Response.json({ code, message }, { status: statusCode }));
}

function handleError(error: unknown) {
  if (error instanceof AuthError) {
    return jsonError(error.statusCode, error.code, error.message);
  }
  if (error instanceof AppError) {
    return jsonError(error.statusCode, error.code, error.message);
  }
  if (error instanceof DomainError) {
    return jsonError(400, error.code, error.message);
  }
  return jsonError(500, "INTERNAL_ERROR", "Internal server error");
}

export async function POST(request: Request) {
  try {
    const { authUid, providerIds } = await verifyCustomerAuth(request);
    const body = await request.json();
    const input = v.parse(signupBodySchema, body);

    const isGoogle = providerIds.includes("google.com");
    const existing = await createUserRepository().findByAuthUid(authUid);

    if (existing) {
      if (isGoogle && input.providerUid && input.primaryEmail) {
        const hasGoogle = existing
          .getAuthProviders()
          .some((p) => p.getProviderId() === "google.com");
        if (!hasGoogle) {
          await createLinkGoogleToAnonymousUserUseCase().execute({
            authUid,
            providerUid: input.providerUid,
            primaryEmail: input.primaryEmail,
          });
        }
      }
      return withNoStore(
        Response.json({ userId: existing.getUserId(), isNew: false }),
      );
    }

    if (isGoogle) {
      if (!input.providerUid || !input.primaryEmail) {
        return jsonError(
          400,
          "INVALID_REQUEST",
          "providerUid and primaryEmail are required for google signup",
        );
      }
      const result = await createSignInWithGoogleUseCase().execute({
        authUid,
        providerUid: input.providerUid,
        primaryEmail: input.primaryEmail,
        displayName: input.displayName,
        phoneNumber: input.phoneNumber,
        birthDate: input.birthDate,
      });
      return withNoStore(Response.json(result));
    }

    const result = await createSignupAnonymouslyUseCase().execute({
      authUid,
      displayName: input.displayName,
      primaryEmail: input.primaryEmail,
      phoneNumber: input.phoneNumber,
      birthDate: input.birthDate,
    });
    return withNoStore(Response.json({ ...result, isNew: true }));
  } catch (error) {
    if (error instanceof v.ValiError) {
      return jsonError(400, "INVALID_REQUEST", "Invalid request body");
    }
    return handleError(error);
  }
}
