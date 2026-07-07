export interface IEmailService {
  sendBookingConfirmation(params: {
    customerEmail: string;
    customerName: string;
    consultantName: string;
    joinUrl: string;
    startsAt: Date;
    bookingId: string;
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
    amountJPY: number;
    bookingId: string;
  }): Promise<void>;

  sendConsultationReminder(params: {
    customerEmail: string;
    customerName: string;
    consultantName: string;
    joinUrl: string;
    startsAt: Date;
    bookingId: string;
  }): Promise<void>;

  sendInvitation(params: {
    email: string;
    role: string;
    passwordResetLink: string;
  }): Promise<void>;

  sendPasswordReset(params: {
    email: string;
    passwordResetLink: string;
  }): Promise<void>;
}
