import type { ZoomSession } from "@/domain/zoom-session/zoom-session";

export interface IZoomSessionRepository {
  findByDate(
    organizationId: string,
    sessionDate: string,
  ): Promise<ZoomSession | null>;
  save(session: ZoomSession): Promise<void>;
}
