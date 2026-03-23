import type { IZoomService } from "@/application/shared/iZoomService";

export class ZoomService implements IZoomService {
  async createMeetingUrl(_params: {
    startDatetime: Date;
    consultantId: string;
  }): Promise<string> {
    throw new Error("Not implemented");
  }
}
