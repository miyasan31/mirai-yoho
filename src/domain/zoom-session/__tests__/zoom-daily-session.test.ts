import { DomainError } from "@/domain/shared/domain-error";
import { BreakoutRoom } from "@/domain/zoom-session/breakout-room";
import { ZoomDailySession } from "@/domain/zoom-session/zoom-daily-session";

const ORGANIZATION_ID = "org-1";

describe("BreakoutRoom", () => {
  it("参加者を追加すると新しいインスタンスが返る", () => {
    const room = BreakoutRoom.create({
      consultantId: "c-1",
      roomName: "田中太郎",
      participantEmails: [],
    });

    const updated = room.addParticipant("customer@example.com");

    expect(updated.getParticipantEmails()).toEqual(["customer@example.com"]);
    expect(room.getParticipantEmails()).toEqual([]);
  });

  it("重複メールを追加すると PARTICIPANT_ALREADY_ASSIGNED エラー", () => {
    const room = BreakoutRoom.create({
      consultantId: "c-1",
      roomName: "田中太郎",
      participantEmails: ["customer@example.com"],
    });

    expect(() => room.addParticipant("customer@example.com")).toThrow(
      DomainError,
    );
  });

  it("参加者を削除すると新しいインスタンスが返る", () => {
    const room = BreakoutRoom.create({
      consultantId: "c-1",
      roomName: "田中太郎",
      participantEmails: ["a@example.com", "b@example.com"],
    });

    const updated = room.removeParticipant("a@example.com");

    expect(updated.getParticipantEmails()).toEqual(["b@example.com"]);
    expect(room.getParticipantEmails()).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });

  it("hasParticipant で参加者の存在を確認できる", () => {
    const room = BreakoutRoom.create({
      consultantId: "c-1",
      roomName: "田中太郎",
      participantEmails: ["customer@example.com"],
    });

    expect(room.hasParticipant("customer@example.com")).toBe(true);
    expect(room.hasParticipant("other@example.com")).toBe(false);
  });
});

describe("ZoomDailySession", () => {
  function createSession() {
    return ZoomDailySession.create({
      organizationId: ORGANIZATION_ID,
      sessionId: "session-1",
      sessionDate: "2026-04-01",
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

  describe("assignParticipant", () => {
    it("新しい相談員のルームが作成され参加者が追加される", () => {
      const session = createSession();
      session.assignParticipant("c-1", "田中太郎", "customer@example.com");

      const rooms = session.getBreakoutRooms();
      expect(rooms).toHaveLength(1);
      expect(rooms[0].getConsultantId()).toBe("c-1");
      expect(rooms[0].getRoomName()).toBe("田中太郎");
      expect(rooms[0].getParticipantEmails()).toEqual(["customer@example.com"]);
    });

    it("既存の相談員ルームに参加者を追加できる", () => {
      const session = createSession();
      session.assignParticipant("c-1", "田中太郎", "customer1@example.com");
      session.assignParticipant("c-1", "田中太郎", "customer2@example.com");

      const rooms = session.getBreakoutRooms();
      expect(rooms).toHaveLength(1);
      expect(rooms[0].getParticipantEmails()).toEqual([
        "customer1@example.com",
        "customer2@example.com",
      ]);
    });

    it("異なる相談員には別のルームが作成される", () => {
      const session = createSession();
      session.assignParticipant("c-1", "田中太郎", "customer1@example.com");
      session.assignParticipant("c-2", "佐藤花子", "customer2@example.com");

      const rooms = session.getBreakoutRooms();
      expect(rooms).toHaveLength(2);
      expect(rooms[0].getRoomName()).toBe("田中太郎");
      expect(rooms[1].getRoomName()).toBe("佐藤花子");
    });

    it("同じメールを同じルームに二重追加すると PARTICIPANT_ALREADY_ASSIGNED エラー", () => {
      const session = createSession();
      session.assignParticipant("c-1", "田中太郎", "customer@example.com");

      expect(() =>
        session.assignParticipant("c-1", "田中太郎", "customer@example.com"),
      ).toThrow(DomainError);
    });
  });

  describe("removeParticipant", () => {
    it("参加者をルームから削除できる", () => {
      const session = createSession();
      session.assignParticipant("c-1", "田中太郎", "customer@example.com");
      session.removeParticipant("customer@example.com");

      const rooms = session.getBreakoutRooms();
      expect(rooms).toHaveLength(1);
      expect(rooms[0].getParticipantEmails()).toEqual([]);
    });

    it("存在しないメールを削除してもエラーにならない", () => {
      const session = createSession();
      session.assignParticipant("c-1", "田中太郎", "customer@example.com");

      expect(() =>
        session.removeParticipant("nonexistent@example.com"),
      ).not.toThrow();
    });
  });

  describe("reconstruct", () => {
    it("永続化から復元できる", () => {
      const session = ZoomDailySession.reconstruct({
        organizationId: ORGANIZATION_ID,
        sessionId: "session-1",
        sessionDate: "2026-04-01",
        zoomMeetingId: "12345",
        joinUrl: "https://zoom.us/j/12345",
        breakoutRooms: [
          BreakoutRoom.create({
            consultantId: "c-1",
            roomName: "田中太郎",
            participantEmails: ["customer@example.com"],
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
