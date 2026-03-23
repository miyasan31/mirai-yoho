export interface IZoomService {
  createMeetingUrl(params: {
    startDatetime: Date;
    consultantId: string;
  }): Promise<string>;
}
