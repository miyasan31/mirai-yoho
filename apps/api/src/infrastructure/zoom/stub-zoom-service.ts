import type { IZoomService } from "@/application/shared/zoom-service";

export class StubZoomService implements IZoomService {
  async createDailyMeeting(params: {
    sessionDate: string;
    breakoutRooms: Array<{ name: string; participants: string[] }>;
  }): Promise<{ meetingId: string; joinUrl: string }> {
    const meetingId = `stub-meeting-${params.sessionDate}`;
    const joinUrl = `https://zoom.us/j/stub-${params.sessionDate}`;
    console.info("[ZoomStub] createDailyMeeting", {
      sessionDate: params.sessionDate,
      breakoutRoomsCount: params.breakoutRooms.length,
      meetingId,
      joinUrl,
    });
    return { meetingId, joinUrl };
  }

  async updateBreakoutRooms(params: {
    meetingId: string;
    breakoutRooms: Array<{ name: string; participants: string[] }>;
  }): Promise<void> {
    console.info("[ZoomStub] updateBreakoutRooms", {
      meetingId: params.meetingId,
      breakoutRoomsCount: params.breakoutRooms.length,
    });
  }
}
