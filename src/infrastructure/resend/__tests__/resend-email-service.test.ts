const sendEmailMock = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn(function ResendMock() {
    return {
      emails: {
        send: sendEmailMock,
      },
    };
  }),
}));

describe("ResendEmailService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.RESEND_FROM_EMAIL = "noreply@example.com";
    process.env.RESEND_API_KEY = "re_test_key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  async function createService() {
    const module = await import("@/infrastructure/resend/resend-email-service");
    return new module.ResendEmailService();
  }

  it("does not call resend and logs email payload when EMAIL_DELIVERY_MODE=log", async () => {
    process.env.EMAIL_DELIVERY_MODE = "log";
    const service = await createService();
    const consoleInfoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => {});

    await service.sendBookingConfirmation({
      customerEmail: "taro@example.com",
      customerName: "太郎",
      consultantName: "山田",
      joinUrl: "https://zoom.example.com/abc",
      startsAt: new Date("2026-04-20T10:00:00+09:00"),
      bookingId: "booking-123",
    });

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[email:log]",
      expect.objectContaining({
        emailType: "booking-confirmation",
        from: "noreply@example.com",
        to: "taro@example.com",
        subject: "【未来予報】ご予約確認",
        html: expect.stringContaining("booking-123"),
      }),
    );
  });

  it("calls resend when EMAIL_DELIVERY_MODE=resend", async () => {
    process.env.EMAIL_DELIVERY_MODE = "resend";
    const service = await createService();

    await service.sendInvitation({
      email: "invitee@example.com",
      role: "consultant",
      passwordResetLink: "https://example.com/reset",
    });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith({
      from: "noreply@example.com",
      to: "invitee@example.com",
      subject: "【未来予報】アカウント招待のお知らせ",
      html: expect.stringContaining("https://example.com/reset"),
    });
  });
});
