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
    // Resend SDK は例外ではなく { data, error } を返す
    sendEmailMock.mockResolvedValue({ data: { id: "email-1" }, error: null });
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
      cancelUrl: "https://user.example.com/org-1/booking/cancel?token=t",
    });

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[email:log]",
      expect.objectContaining({
        emailType: "booking-confirmation",
        from: "noreply@example.com",
        to: "taro@example.com",
        subject: "【あなたのみらい予報】ご予約確認",
        html: expect.stringContaining("booking-123"),
      }),
    );
  });

  it("予約確認メールにキャンセルリンクを含める", async () => {
    process.env.EMAIL_DELIVERY_MODE = "resend";
    const service = await createService();
    const cancelUrl =
      "https://user.example.com/org-1/booking/cancel?token=booking-123.2026-04-19T01%3A00%3A00.000Z.sig";

    await service.sendBookingConfirmation({
      customerEmail: "taro@example.com",
      customerName: "太郎",
      consultantName: "山田",
      joinUrl: "https://zoom.example.com/abc",
      startsAt: new Date("2026-04-20T10:00:00+09:00"),
      bookingId: "booking-123",
      cancelUrl,
    });

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(`href="${cancelUrl}"`),
      }),
    );
  });

  it("領収書メールにインボイス記載事項（登録番号・税率・税額）を含める", async () => {
    process.env.EMAIL_DELIVERY_MODE = "resend";
    process.env.INVOICE_REGISTRATION_NUMBER = "T1234567890123";
    const service = await createService();

    await service.sendPaymentReceipt({
      customerEmail: "taro@example.com",
      customerName: "太郎",
      amountJPY: 4546,
      taxAmountJPY: 454,
      taxRate: 0.1,
      totalJPY: 5000,
      bookingId: "booking-123",
      chargedAt: new Date("2026-04-21T00:30:00+09:00"),
    });

    const html = sendEmailMock.mock.calls[0][0].html as string;
    expect(html).toContain("T1234567890123");
    expect(html).toContain("10%対象");
    expect(html).toContain("¥454");
    expect(html).toContain("¥4,546");
    expect(html).toContain("¥5,000");
    expect(html).toContain("2026/04/21");
  });

  it("バッチ実行レポートは宛先が空なら送らない", async () => {
    process.env.EMAIL_DELIVERY_MODE = "resend";
    const service = await createService();

    await service.sendBatchChargeReport({
      adminEmails: [],
      organizationId: "org-1",
      startedAt: new Date("2026-04-21T00:00:00+09:00"),
      chargedCount: 0,
      completedCount: 0,
      errors: [],
      consoleBookingsUrl: "https://console.example.com/org-1/bookings",
    });

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("バッチ実行レポートはエラー件数を件名と本文に載せる", async () => {
    process.env.EMAIL_DELIVERY_MODE = "resend";
    const service = await createService();

    await service.sendBatchChargeReport({
      adminEmails: ["admin1@example.com", "admin2@example.com"],
      organizationId: "org-1",
      startedAt: new Date("2026-04-21T00:00:00+09:00"),
      chargedCount: 3,
      completedCount: 1,
      errors: [{ bookingId: "booking-9", error: "Payment not found" }],
      consoleBookingsUrl: "https://console.example.com/org-1/bookings",
    });

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin1@example.com", "admin2@example.com"],
        subject: expect.stringContaining("エラーあり"),
        html: expect.stringContaining("booking-9: Payment not found"),
      }),
    );
  });

  it("Resend がエラーを返したら握り潰さずログに残す", async () => {
    process.env.EMAIL_DELIVERY_MODE = "resend";
    sendEmailMock.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "Invalid `to` field." },
    });
    const service = await createService();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await service.sendPasswordReset({
      email: "taro@example.com",
      passwordResetLink: "https://example.com/reset",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[email:failed]",
      expect.objectContaining({
        emailType: "password-reset",
        to: "taro@example.com",
      }),
    );
  });

  it("calls resend when EMAIL_DELIVERY_MODE=resend", async () => {
    process.env.EMAIL_DELIVERY_MODE = "resend";
    const service = await createService();

    await service.sendInvitation({
      email: "invitee@example.com",
      roleName: "管理者",
      isConsultant: true,
      passwordResetLink: "https://example.com/reset",
    });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith({
      from: "noreply@example.com",
      to: "invitee@example.com",
      subject: "【あなたのみらい予報】アカウント招待のお知らせ",
      html: expect.stringContaining("https://example.com/reset"),
    });
  });
});
