import { DomainError } from "@mirai-yoho/shared/domain-error";
import {
  BREAKOUT_ROOM_NAME_MAX_LENGTH,
  BreakoutRoom,
} from "@/domain/zoom-session/breakout-room";
import {
  MAX_BREAKOUT_ROOMS_PER_SESSION,
  ZoomSession,
} from "@/domain/zoom-session/zoom-session";

const ORGANIZATION_ID = "org-1";

/** JST 2026-04-01 10:00 */
const STARTS_AT = new Date("2026-04-01T01:00:00Z");
/** JST 2026-04-01 11:00 */
const ENDS_AT = new Date("2026-04-01T02:00:00Z");

describe("BreakoutRoom", () => {
  describe("composeRoomName", () => {
    it("`{相談員名} {開始}-{終了}` 形式で JST の時刻が入る", () => {
      const name = BreakoutRoom.composeRoomName({
        consultantName: "田中太郎",
        startsAt: STARTS_AT,
        endsAt: ENDS_AT,
      });

      expect(name).toBe("田中太郎 10:00-11:00");
    });

    it("日付をまたぐ深夜帯も 24 時表記にならない", () => {
      const name = BreakoutRoom.composeRoomName({
        consultantName: "田中太郎",
        // JST 2026-04-02 00:00 〜 00:30
        startsAt: new Date("2026-04-01T15:00:00Z"),
        endsAt: new Date("2026-04-01T15:30:00Z"),
      });

      expect(name).toBe("田中太郎 00:00-00:30");
    });

    it("相談員名が長い場合は上限に収まるよう切り詰める", () => {
      const name = BreakoutRoom.composeRoomName({
        consultantName: "あ".repeat(40),
        startsAt: STARTS_AT,
        endsAt: ENDS_AT,
      });

      expect(name.length).toBe(BREAKOUT_ROOM_NAME_MAX_LENGTH);
      expect(name).toBe(`${"あ".repeat(19)}… 10:00-11:00`);
    });
  });

  describe("create", () => {
    it("上限を超えるルーム名は BREAKOUT_ROOM_NAME_TOO_LONG エラー", () => {
      expect(() =>
        BreakoutRoom.create({
          bookingId: "b-1",
          consultantId: "c-1",
          roomName: "あ".repeat(BREAKOUT_ROOM_NAME_MAX_LENGTH + 1),
          customerEmail: "customer@example.com",
        }),
      ).toThrow(DomainError);
    });
  });
});

describe("ZoomSession", () => {
  function createSession() {
    return ZoomSession.create({
      organizationId: ORGANIZATION_ID,
      sessionId: "session-1",
      sessionDate: "2026-04-01",
    });
  }

  function assignBooking(
    session: ZoomSession,
    overrides: Partial<Parameters<ZoomSession["assignBooking"]>[0]> = {},
  ) {
    session.assignBooking({
      bookingId: "b-1",
      consultantId: "c-1",
      consultantName: "田中太郎",
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      customerEmail: "customer@example.com",
      ...overrides,
    });
  }

  describe("create", () => {
    it("空のセッションが作成される", () => {
      const session = createSession();
      expect(session.getSessionDate()).toBe("2026-04-01");
      expect(session.getZoomMeetingId()).toBe("");
      expect(session.getJoinUrl()).toBe("");
      expect(session.getBreakoutRooms()).toEqual([]);
    });
  });

  describe("setMeetingDetails", () => {
    it("Zoom ミーティング情報をセットできる", () => {
      const session = createSession();
      session.setMeetingDetails("12345", "https://zoom.us/j/12345");

      expect(session.getZoomMeetingId()).toBe("12345");
      expect(session.getJoinUrl()).toBe("https://zoom.us/j/12345");
    });

    it("二重にセットすると MEETING_ALREADY_SET エラー", () => {
      const session = createSession();
      session.setMeetingDetails("12345", "https://zoom.us/j/12345");

      expect(() =>
        session.setMeetingDetails("99999", "https://zoom.us/j/99999"),
      ).toThrow(DomainError);
    });
  });

  describe("assignBooking", () => {
    it("予約ごとにルームが作成され参加者は顧客 1 名のみ", () => {
      const session = createSession();
      assignBooking(session);

      const rooms = session.getBreakoutRooms();
      expect(rooms).toHaveLength(1);
      expect(rooms[0].getBookingId()).toBe("b-1");
      expect(rooms[0].getConsultantId()).toBe("c-1");
      expect(rooms[0].getRoomName()).toBe("田中太郎 10:00-11:00");
      expect(rooms[0].getCustomerEmail()).toBe("customer@example.com");
    });

    it("同じ相談員でも予約が異なれば別のルームが作成される", () => {
      const session = createSession();
      assignBooking(session, { bookingId: "b-1" });
      assignBooking(session, {
        bookingId: "b-2",
        customerEmail: "customer2@example.com",
        // JST 13:00-14:00
        startsAt: new Date("2026-04-01T04:00:00Z"),
        endsAt: new Date("2026-04-01T05:00:00Z"),
      });

      const rooms = session.getBreakoutRooms();
      expect(rooms).toHaveLength(2);
      expect(rooms.map((r) => r.getRoomName())).toEqual([
        "田中太郎 10:00-11:00",
        "田中太郎 13:00-14:00",
      ]);
      expect(rooms.map((r) => r.getCustomerEmail())).toEqual([
        "customer@example.com",
        "customer2@example.com",
      ]);
    });

    it("同じ予約を二重に割り当てると BOOKING_ALREADY_ASSIGNED エラー", () => {
      const session = createSession();
      assignBooking(session);

      expect(() => assignBooking(session)).toThrow(DomainError);
    });

    it("ルーム数が上限に達すると BREAKOUT_ROOM_LIMIT_EXCEEDED エラー", () => {
      const session = createSession();
      for (let i = 0; i < MAX_BREAKOUT_ROOMS_PER_SESSION; i++) {
        assignBooking(session, {
          bookingId: `b-${i}`,
          customerEmail: `customer${i}@example.com`,
        });
      }

      expect(() => assignBooking(session, { bookingId: "b-over" })).toThrow(
        DomainError,
      );
    });

    // #176 のリグレッション。旧モデルでは同一メールの二重追加でドメインエラーになり
    // ZOOM_INTEGRATION_ERROR に化けていた。予約ごとにルームを分けるため衝突しない
    it("同じ顧客が同じ相談員を同日に複数枠予約しても枠ごとにルームが作られる", () => {
      const session = createSession();
      assignBooking(session, { bookingId: "b-1" });

      expect(() =>
        assignBooking(session, {
          bookingId: "b-2",
          // JST 13:00-14:00
          startsAt: new Date("2026-04-01T04:00:00Z"),
          endsAt: new Date("2026-04-01T05:00:00Z"),
        }),
      ).not.toThrow();

      const rooms = session.getBreakoutRooms();
      expect(rooms).toHaveLength(2);
      expect(rooms.map((r) => r.getCustomerEmail())).toEqual([
        "customer@example.com",
        "customer@example.com",
      ]);
    });
  });

  describe("removeBooking", () => {
    it("対象予約のルームごと削除される", () => {
      const session = createSession();
      assignBooking(session, { bookingId: "b-1" });
      assignBooking(session, {
        bookingId: "b-2",
        customerEmail: "customer2@example.com",
      });

      session.removeBooking("b-1");

      const rooms = session.getBreakoutRooms();
      expect(rooms).toHaveLength(1);
      expect(rooms[0].getBookingId()).toBe("b-2");
    });

    it("存在しない予約を削除してもエラーにならない", () => {
      const session = createSession();
      assignBooking(session);

      expect(() => session.removeBooking("nonexistent")).not.toThrow();
      expect(session.getBreakoutRooms()).toHaveLength(1);
    });
  });

  describe("reconstruct", () => {
    it("永続化から復元できる", () => {
      const session = ZoomSession.reconstruct({
        organizationId: ORGANIZATION_ID,
        sessionId: "session-1",
        sessionDate: "2026-04-01",
        zoomMeetingId: "12345",
        joinUrl: "https://zoom.us/j/12345",
        breakoutRooms: [
          BreakoutRoom.reconstruct({
            bookingId: "b-1",
            consultantId: "c-1",
            roomName: "田中太郎 10:00-11:00",
            customerEmail: "customer@example.com",
          }),
        ],
        createdAt: new Date("2026-04-01T00:00:00Z"),
      });

      expect(session.getSessionId()).toBe("session-1");
      expect(session.getZoomMeetingId()).toBe("12345");
      expect(session.getBreakoutRooms()).toHaveLength(1);
    });
  });
});
