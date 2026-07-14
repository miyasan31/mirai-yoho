import { Hono } from "hono";
import { requirePermission } from "@/infrastructure/auth/require-permission";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import { verifyCloudSchedulerAuth } from "@/infrastructure/auth/verify-cloud-scheduler-auth";
import {
  createBatchChargeUseCase,
  createNotifyLateConsultantArrivalUseCase,
  createSendConsultationReminderUseCase,
} from "@/infrastructure/container";
import { jsonError, postRoute } from "./route-handler";

const BATCH_CHARGE_COOLDOWN_MS = 60 * 1000;
const BATCH_CONSULTATION_REMINDER_COOLDOWN_MS = 60 * 1000;

const batchChargeInProgressOrganizations = new Set<string>();
const batchChargeLastStartedAtByOrganization = new Map<string, number>();
const batchConsultationReminderInProgressOrganizations = new Set<string>();
const batchConsultationReminderLastStartedAtByOrganization = new Map<
  string,
  number
>();

type BatchExecutionActor =
  | { type: "cloud-scheduler"; principal: string }
  | { type: "user"; principal: string };

async function authorizeBatchExecution(
  request: Request,
  organizationId: string,
): Promise<BatchExecutionActor> {
  const schedulerPrincipal = await verifyCloudSchedulerAuth(request);
  if (schedulerPrincipal) {
    return {
      type: "cloud-scheduler",
      principal: schedulerPrincipal.serviceAccountEmail,
    };
  }

  const authUser = await verifyAuth(request);
  requirePermission(authUser, organizationId, "admin.payments.charge");
  return { type: "user", principal: authUser.uid };
}

function getBatchChargeRateLimitState(organizationId: string): {
  inProgress: boolean;
  retryAfterSeconds: number;
} {
  if (batchChargeInProgressOrganizations.has(organizationId)) {
    return { inProgress: true, retryAfterSeconds: 1 };
  }

  const lastStartedAt =
    batchChargeLastStartedAtByOrganization.get(organizationId);
  if (!lastStartedAt) {
    return { inProgress: false, retryAfterSeconds: 0 };
  }

  const elapsedMs = Date.now() - lastStartedAt;
  if (elapsedMs >= BATCH_CHARGE_COOLDOWN_MS) {
    return { inProgress: false, retryAfterSeconds: 0 };
  }

  return {
    inProgress: false,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((BATCH_CHARGE_COOLDOWN_MS - elapsedMs) / 1000),
    ),
  };
}

function getBatchConsultationReminderRateLimitState(organizationId: string): {
  inProgress: boolean;
  retryAfterSeconds: number;
} {
  if (batchConsultationReminderInProgressOrganizations.has(organizationId)) {
    return { inProgress: true, retryAfterSeconds: 1 };
  }

  const lastStartedAt =
    batchConsultationReminderLastStartedAtByOrganization.get(organizationId);
  if (!lastStartedAt) {
    return { inProgress: false, retryAfterSeconds: 0 };
  }

  const elapsedMs = Date.now() - lastStartedAt;
  if (elapsedMs >= BATCH_CONSULTATION_REMINDER_COOLDOWN_MS) {
    return { inProgress: false, retryAfterSeconds: 0 };
  }

  return {
    inProgress: false,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((BATCH_CONSULTATION_REMINDER_COOLDOWN_MS - elapsedMs) / 1000),
    ),
  };
}

export const batchRoutes = new Hono();

batchRoutes.post(
  "/batch/late-arrival-alerts",
  postRoute(async ({ organizationId, request, requestUrl }) => {
    const actor = await authorizeBatchExecution(request, organizationId);

    const startedAt = new Date();
    const result = await createNotifyLateConsultantArrivalUseCase().execute({
      organizationId,
      now: startedAt,
    });
    console.info("Late arrival alert batch completed", {
      category: "security-audit",
      endpoint: `POST ${requestUrl.pathname}`,
      organizationId,
      actorType: actor.type,
      actorPrincipal: actor.principal,
      startedAt: startedAt.toISOString(),
      targetCount: result.targetCount,
      notifiedCount: result.notifiedCount,
      errorCount: result.errors.length,
      errors: result.errors,
    });

    return Response.json(result);
  }),
);

batchRoutes.post(
  "/batch/charge",
  postRoute(async ({ organizationId, request, requestUrl }) => {
    const actor = await authorizeBatchExecution(request, organizationId);

    const rateLimitState = getBatchChargeRateLimitState(organizationId);
    if (rateLimitState.inProgress) {
      return jsonError(
        409,
        "BATCH_CHARGE_IN_PROGRESS",
        "Batch charge is already running for this organization",
      );
    }
    if (rateLimitState.retryAfterSeconds > 0) {
      return jsonError(
        429,
        "BATCH_CHARGE_RATE_LIMITED",
        `Batch charge can be retried after ${rateLimitState.retryAfterSeconds} seconds`,
      );
    }

    batchChargeInProgressOrganizations.add(organizationId);
    batchChargeLastStartedAtByOrganization.set(organizationId, Date.now());
    const startedAt = new Date();

    try {
      const result = await createBatchChargeUseCase().execute(organizationId);
      console.info("Batch charge completed", {
        category: "security-audit",
        endpoint: `POST ${requestUrl.pathname}`,
        organizationId,
        actorType: actor.type,
        actorPrincipal: actor.principal,
        startedAt: startedAt.toISOString(),
        chargedCount: result.chargedCount,
        completedCount: result.completedCount,
        errorCount: result.errors.length,
        errors: result.errors,
      });
      return Response.json({
        chargedCount: result.chargedCount,
        completedCount: result.completedCount,
      });
    } catch (error) {
      console.error("Batch charge failed", {
        category: "security-audit",
        endpoint: `POST ${requestUrl.pathname}`,
        organizationId,
        actorType: actor.type,
        actorPrincipal: actor.principal,
        startedAt: startedAt.toISOString(),
        error,
      });
      throw error;
    } finally {
      batchChargeInProgressOrganizations.delete(organizationId);
    }
  }),
);

batchRoutes.post(
  "/batch/consultation-reminders",
  postRoute(async ({ organizationId, request, requestUrl }) => {
    const actor = await authorizeBatchExecution(request, organizationId);

    const rateLimitState =
      getBatchConsultationReminderRateLimitState(organizationId);
    if (rateLimitState.inProgress) {
      return jsonError(
        409,
        "BATCH_CONSULTATION_REMINDER_IN_PROGRESS",
        "Batch consultation reminder is already running for this organization",
      );
    }
    if (rateLimitState.retryAfterSeconds > 0) {
      return jsonError(
        429,
        "BATCH_CONSULTATION_REMINDER_RATE_LIMITED",
        `Batch consultation reminder can be retried after ${rateLimitState.retryAfterSeconds} seconds`,
      );
    }

    batchConsultationReminderInProgressOrganizations.add(organizationId);
    batchConsultationReminderLastStartedAtByOrganization.set(
      organizationId,
      Date.now(),
    );
    const startedAt = new Date();

    try {
      const result =
        await createSendConsultationReminderUseCase().execute(organizationId);
      console.info("Batch consultation reminder completed", {
        category: "security-audit",
        endpoint: `POST ${requestUrl.pathname}`,
        organizationId,
        actorType: actor.type,
        actorPrincipal: actor.principal,
        startedAt: startedAt.toISOString(),
        sentCount: result.sentCount,
        skippedCount: result.skippedCount,
        errorCount: result.errors.length,
        errors: result.errors,
      });
      return Response.json({
        sentCount: result.sentCount,
        skippedCount: result.skippedCount,
      });
    } catch (error) {
      console.error("Batch consultation reminder failed", {
        category: "security-audit",
        endpoint: `POST ${requestUrl.pathname}`,
        organizationId,
        actorType: actor.type,
        actorPrincipal: actor.principal,
        startedAt: startedAt.toISOString(),
        error,
      });
      throw error;
    } finally {
      batchConsultationReminderInProgressOrganizations.delete(organizationId);
    }
  }),
);
