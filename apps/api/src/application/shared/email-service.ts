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
    startsAt: Date;
    cancellationCategory: "before_previous_day" | "on_the_day" | "no_show";
    cancellationFeeJPY: number;
    refundJPY: number;
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
    roleName: string;
    isConsultant: boolean;
    passwordResetLink: string;
  }): Promise<void>;

  sendPasswordReset(params: {
    email: string;
    passwordResetLink: string;
  }): Promise<void>;
}
