import { getStorage } from "firebase-admin/storage";
import { Hono } from "hono";
import { UpdateProfileUseCase } from "@/application/consultant/update-profile-use-case";
import { envServer } from "@/config/env.server";
import { Settings } from "@/domain/settings/settings";
import { requireRole } from "@/infrastructure/auth/require-role";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createConsultantRepository,
  createSettingsRepository,
} from "@/infrastructure/container";
import { FirestoreConsultantRepository } from "@/infrastructure/firestore/firestore-consultant-repository";
import { app } from "@/infrastructure/firestore/firestore-customer";
import {
  resolveConsultantStatus,
  toConsultantStatusResponse,
} from "./consultant-status";
import {
  getRoute,
  jsonError,
  noStoreJson,
  patchRoute,
  postRoute,
} from "./route-handler";

const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024;
const AVATAR_UPLOAD_URL_TTL_MS = 10 * 60 * 1000;
const ALLOWED_AVATAR_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const AVATAR_EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getAvatarObjectPath(params: {
  organizationId: string;
  consultantId: string;
  contentType: string;
}): string {
  const extension = AVATAR_EXTENSION_BY_CONTENT_TYPE[params.contentType];
  return `organizations/${params.organizationId}/consultants/${params.consultantId}/avatar.${extension}`;
}

function isAllowedAvatarObjectPath(params: {
  objectPath: string;
  organizationId: string;
  consultantId: string;
}): boolean {
  const prefix = `organizations/${params.organizationId}/consultants/${params.consultantId}/avatar.`;
  if (!params.objectPath.startsWith(prefix)) return false;
  const extension = params.objectPath.slice(prefix.length);
  return extension === "jpg" || extension === "png" || extension === "webp";
}

export const consultantProfileRoutes = new Hono();

consultantProfileRoutes.get(
  "/consultant/profile",
  getRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requireRole(authUser, organizationId, "consultant");
    const consultant = await createConsultantRepository().findById(
      organizationId,
      authUser.uid,
    );

    if (!consultant) {
      const settings =
        (await createSettingsRepository().findByOrganizationId(
          organizationId,
        )) ?? Settings.createDefault(organizationId);
      const status = resolveConsultantStatus(
        settings,
        settings.getDefaultConsultantStatusId(),
      );
      return noStoreJson({
        consultantId: authUser.uid,
        name: "",
        bio: "",
        phone: "",
        specialties: [],
        zoomRoomIds: [],
        status: toConsultantStatusResponse(status),
        isActive: true,
      });
    }

    const settings =
      (await createSettingsRepository().findByOrganizationId(organizationId)) ??
      Settings.createDefault(organizationId);
    const profile = consultant.getProfile();
    const status = resolveConsultantStatus(settings, consultant.getStatusId());
    return noStoreJson({
      consultantId: consultant.getConsultantId(),
      name: profile.getDisplayName(),
      bio: profile.getBio(),
      phone: profile.getPhone(),
      imageUrl: profile.getImageUrl(),
      specialties: [...profile.getSpecialties()],
      zoomRoomIds: consultant.getZoomRoomIds(),
      status: toConsultantStatusResponse(status),
      isActive: consultant.getIsActive(),
    });
  }),
);

consultantProfileRoutes.patch(
  "/consultant/profile",
  patchRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requireRole(authUser, organizationId, "consultant");
    const body = await request.json();
    if (!body.name || !Array.isArray(body.specialties)) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "name and specialties are required",
      );
    }

    await new UpdateProfileUseCase(new FirestoreConsultantRepository()).execute(
      {
        organizationId,
        consultantId: authUser.uid,
        name: body.name,
        bio: body.bio ?? "",
        specialties: body.specialties,
        phone: body.phone ?? "",
        imageUrl: body.imageUrl,
      },
    );

    return Response.json({ success: true });
  }),
);

consultantProfileRoutes.post(
  "/consultant/profile/avatar-upload-url",
  postRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requireRole(authUser, organizationId, "consultant");
    const body = await request.json();
    const contentType = body.contentType;
    const fileSize = body.fileSize;

    if (typeof contentType !== "string" || !contentType) {
      return jsonError(400, "VALIDATION_ERROR", "contentType is required");
    }
    if (!ALLOWED_AVATAR_CONTENT_TYPES.has(contentType)) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "contentType must be one of image/jpeg, image/png, image/webp",
      );
    }
    if (typeof fileSize !== "number" || fileSize <= 0) {
      return jsonError(400, "VALIDATION_ERROR", "fileSize is required");
    }
    if (fileSize > AVATAR_MAX_FILE_SIZE) {
      return jsonError(400, "VALIDATION_ERROR", "fileSize exceeds 5MB limit");
    }

    const objectPath = getAvatarObjectPath({
      organizationId,
      consultantId: authUser.uid,
      contentType,
    });
    const bucketName = envServer.firebaseStorageBucket;
    const expiresAt = Date.now() + AVATAR_UPLOAD_URL_TTL_MS;
    const file = getStorage(app).bucket(bucketName).file(objectPath);
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: expiresAt,
      contentType,
    });

    return Response.json({
      uploadUrl,
      objectPath,
      contentType,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  }),
);

consultantProfileRoutes.post(
  "/consultant/profile/avatar-publish",
  postRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requireRole(authUser, organizationId, "consultant");
    const body = await request.json();
    const objectPath = body.objectPath;

    if (typeof objectPath !== "string" || !objectPath) {
      return jsonError(400, "VALIDATION_ERROR", "objectPath is required");
    }

    if (
      !isAllowedAvatarObjectPath({
        objectPath,
        organizationId,
        consultantId: authUser.uid,
      })
    ) {
      return jsonError(400, "VALIDATION_ERROR", "invalid objectPath");
    }

    const bucketName = envServer.firebaseStorageBucket;
    const file = getStorage(app).bucket(bucketName).file(objectPath);
    const [exists] = await file.exists();
    if (!exists) {
      return jsonError(404, "NOT_FOUND", "avatar file not found");
    }

    await file.makePublic();

    return Response.json({
      imageUrl: `https://storage.googleapis.com/${bucketName}/${objectPath}?v=${Date.now()}`,
    });
  }),
);
