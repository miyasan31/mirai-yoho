import type { IZoomService } from "@/application/shared/zoom-service";

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ZoomMeetingResponse {
  join_url: string;
}

export class ZoomService implements IZoomService {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const accountId = process.env.ZOOM_ACCOUNT_ID as string;
    const clientId = process.env.ZOOM_CLIENT_ID as string;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET as string;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
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

  async createMeetingUrl(params: {
    startDatetime: Date;
    consultantId: string;
  }): Promise<string> {
    const token = await this.getAccessToken();
    const hostUserId = process.env.ZOOM_HOST_USER_ID as string;

    const response = await fetch(
      `https://api.zoom.us/v2/users/${hostUserId}/meetings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: "未来予報 相談セッション",
          type: 2,
          start_time: params.startDatetime.toISOString(),
          duration: 60,
          timezone: "Asia/Tokyo",
          settings: {
            join_before_host: true,
            waiting_room: false,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Zoom meeting creation failed: ${response.status}`);
    }

    const data = (await response.json()) as ZoomMeetingResponse;
    return data.join_url;
  }
}
