import type { ZoomDailySession } from "@/domain/zoom-session/zoom-daily-session";

export interface IZoomDailySessionRepository {
  findByDate(sessionDate: string): Promise<ZoomDailySession | null>;
  save(session: ZoomDailySession): Promise<void>;
}
