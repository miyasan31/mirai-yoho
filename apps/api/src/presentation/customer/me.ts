import { DomainError } from "@mirai-yoho/shared/domain-error";
import * as v from "valibot";
import { AppError } from "@/application/shared/app-error";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { verifyCustomerAuth } from "@/infrastructure/auth/verify-customer-auth";
import {
  createLinkExistingCustomersToUserUseCase,
  createUpdateUserProfileUseCase,
  createUserRepository,
  createWithdrawUserUseCase,
} from "@/infrastructure/container";
import { withNoStore } from "../cache-control";

const updateProfileBodySchema = v.object({
  displayName: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))),
  primaryEmail: v.optional(v.pipe(v.string(), v.trim(), v.email())),
  birthDate: v.optional(v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/))),
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

export async function GET(request: Request) {
  try {
    const { authUid } = await verifyCustomerAuth(request);
    const user = await createUserRepository().findByAuthUid(authUid);
    if (!user) {
      return jsonError(
        404,
        "CUSTOMER_NOT_SIGNED_UP",
        "Customer has not signed up yet",
      );
    }

    if (user.getPrimaryEmail()) {
      try {
        await createLinkExistingCustomersToUserUseCase().execute({ authUid });
      } catch {
        // 紐付けは best-effort、失敗してもプロフィール参照は続行
      }
    }
    return withNoStore(
      Response.json({
        userId: user.getUserId(),
        authUid: user.getAuthUid(),
        displayName: user.getDisplayName(),
        primaryEmail: user.getPrimaryEmail() ?? null,
        birthDate: user.getBirthDate().getValue(),
        status: user.getStatus(),
        authProviders: user.getAuthProviders().map((p) => ({
          providerId: p.getProviderId(),
          linkedAt: p.getLinkedAt().toISOString(),
        })),
        hasActiveZoomConnection: user.hasActiveZoomConnection(),
        zoomEmail: user.getZoomEmail() ?? null,
        createdAt: user.getCreatedAt().toISOString(),
        updatedAt: user.getUpdatedAt().toISOString(),
      }),
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { authUid } = await verifyCustomerAuth(request);
    const body = await request.json();
    const input = v.parse(updateProfileBodySchema, body);

    await createUpdateUserProfileUseCase().execute({
      authUid,
      ...input,
    });

    return withNoStore(Response.json({ ok: true }));
  } catch (error) {
    if (error instanceof v.ValiError) {
      return jsonError(400, "INVALID_REQUEST", "Invalid request body");
    }
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { authUid } = await verifyCustomerAuth(request);
    await createWithdrawUserUseCase().execute({ authUid });
    return withNoStore(Response.json({ ok: true }));
  } catch (error) {
    return handleError(error);
  }
}
