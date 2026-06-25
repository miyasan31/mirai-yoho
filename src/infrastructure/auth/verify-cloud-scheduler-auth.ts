import { OAuth2Client } from "google-auth-library";
import { envServer } from "@/config/env.server";

const CLOUD_SCHEDULER_SERVICE_ACCOUNT_ID = "batch-scheduler";

export type CloudSchedulerPrincipal = {
  serviceAccountEmail: string;
};

const oauth2Customer = new OAuth2Client();

function getExpectedServiceAccountEmail(): string | null {
  const projectId = envServer.firebaseProjectId;
  if (!projectId) {
    return null;
  }

  return `${CLOUD_SCHEDULER_SERVICE_ACCOUNT_ID}@${projectId}.iam.gserviceaccount.com`;
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7);
}

export async function verifyCloudSchedulerAuth(
  request: Request,
): Promise<CloudSchedulerPrincipal | null> {
  const expectedServiceAccountEmail = getExpectedServiceAccountEmail();
  const idToken = getBearerToken(request);
  if (!expectedServiceAccountEmail || !idToken) {
    return null;
  }

  try {
    const ticket = await oauth2Customer.verifyIdToken({
      idToken,
      audience: envServer.appUrl,
    });
    const payload = ticket.getPayload();
    if (
      !payload ||
      payload.email !== expectedServiceAccountEmail ||
      payload.email_verified !== true
    ) {
      return null;
    }

    return { serviceAccountEmail: expectedServiceAccountEmail };
  } catch {
    return null;
  }
}
