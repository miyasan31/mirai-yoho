import type { IZoomService } from "@/application/shared/zoom-service";

export class ZoomService implements IZoomService {
  async createMeetingUrl(_params: {
    startDatetime: Date;
    consultantId: string;
  }): Promise<string> {
    throw new Error("Not implemented");
  }
}
