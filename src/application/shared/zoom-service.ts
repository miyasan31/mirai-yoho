export interface IZoomService {
  createDailyMeeting(params: {
    sessionDate: string;
    breakoutRooms: Array<{ name: string; participants: string[] }>;
  }): Promise<{ meetingId: string; joinUrl: string }>;

  updateBreakoutRooms(params: {
    meetingId: string;
    breakoutRooms: Array<{ name: string; participants: string[] }>;
  }): Promise<void>;
}
