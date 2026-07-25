import type { IZoomService } from "@/application/shared/zoom-service";
import { envServer } from "@/config/env.server";

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ZoomMeetingResponse {
  id: number;
  join_url: string;
}

export class ZoomService implements IZoomService {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const accountId = envServer.zoomAccountId;
    const customerId = envServer.zoomCustomerId;
    const customerSecret = envServer.zoomCustomerSecret;
    const credentials = Buffer.from(`${customerId}:${customerSecret}`).toString(
      "base64",
    );

    const response = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Zoom OAuth failed: ${response.status}`);
    }

    const data = (await response.json()) as ZoomTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  async createDailyMeeting(params: {
    sessionDate: string;
    breakoutRooms: Array<{ name: string; participants: string[] }>;
  }): Promise<{ meetingId: string; joinUrl: string }> {
    const token = await this.getAccessToken();
    const hostUserId = envServer.zoomHostUserId;

    const startTime = `${params.sessionDate}T09:00:00`;

    const response = await fetch(
      `https://api.zoom.us/v2/users/${hostUserId}/meetings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: `あなたのみらい予報 セッション ${params.sessionDate}`,
          type: 2,
          start_time: startTime,
          duration: 480,
          timezone: "Asia/Tokyo",
          settings: {
            join_before_host: true,
            waiting_room: false,
            breakout_room: {
              enable: true,
              rooms: params.breakoutRooms.map((room) => ({
                name: room.name,
                participants: room.participants,
              })),
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Zoom meeting creation failed: ${response.status}`);
    }

    const data = (await response.json()) as ZoomMeetingResponse;
    return { meetingId: String(data.id), joinUrl: data.join_url };
  }

  async updateBreakoutRooms(params: {
    meetingId: string;
    breakoutRooms: Array<{ name: string; participants: string[] }>;
  }): Promise<void> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `https://api.zoom.us/v2/meetings/${params.meetingId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: {
            breakout_room: {
              enable: true,
              rooms: params.breakoutRooms.map((room) => ({
                name: room.name,
                participants: room.participants,
              })),
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Zoom breakout room update failed: ${response.status}`);
    }
  }
}
