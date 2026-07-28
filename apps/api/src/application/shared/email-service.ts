export interface IEmailService {
  sendBookingConfirmation(params: {
    customerEmail: string;
    customerName: string;
    consultantName: string;
    joinUrl: string;
    startsAt: Date;
    bookingId: string;
    /** キャンセル期限まで有効な署名付きキャンセル URL */
    cancelUrl: string;
  }): Promise<void>;

  sendBookingCancellation(params: {
    customerEmail: string;
    customerName: string;
    consultantName: string;
    bookingId: string;
    cancelledBy: "customer" | "admin";
  }): Promise<void>;

  sendPaymentReceipt(params: {
    customerEmail: string;
    customerName: string;
    /** 税抜金額 */
    amountJPY: number;
    /** 消費税額 */
    taxAmountJPY: number;
    /** 税率（例: 0.1） */
    taxRate: number;
    /** 税込合計 */
    totalJPY: number;
    bookingId: string;
    chargedAt: Date;
  }): Promise<void>;

  sendConsultationReminder(params: {
    customerEmail: string;
    customerName: string;
    consultantName: string;
    joinUrl: string;
    startsAt: Date;
    bookingId: string;
  }): Promise<void>;

  /** 予約確定を担当占い師へ通知する（PRD §3.7） */
  sendConsultantBookingNotice(params: {
    consultantEmail: string;
    consultantName: string;
    customerName: string;
    joinUrl: string;
    startsAt: Date;
    bookingId: string;
  }): Promise<void>;

  /** 予約キャンセルを担当占い師へ通知する（PRD §3.7） */
  sendConsultantCancellationNotice(params: {
    consultantEmail: string;
    consultantName: string;
    customerName: string;
    startsAt: Date;
    bookingId: string;
    cancelledBy: "customer" | "admin";
  }): Promise<void>;

  /** 課金バッチの実行結果を管理者へ通知する（PRD §3.7） */
  sendBatchChargeReport(params: {
    adminEmails: string[];
    organizationId: string;
    startedAt: Date;
    chargedCount: number;
    completedCount: number;
    errors: Array<{ bookingId: string; error: string }>;
    consoleBookingsUrl: string;
  }): Promise<void>;

  sendInvitation(params: {
    email: string;
    roleName: string;
    isConsultant: boolean;
    passwordResetLink: string;
  }): Promise<void>;

  sendPasswordReset(params: {
    email: string;
    passwordResetLink: string;
  }): Promise<void>;
}
