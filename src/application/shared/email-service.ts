export interface IEmailService {
  sendBookingConfirmation(params: {
    clientEmail: string;
    clientName: string;
    consultantName: string;
    zoomUrl: string;
    startDatetime: Date;
    bookingId: string;
  }): Promise<void>;

  sendBookingCancellation(params: {
    clientEmail: string;
    clientName: string;
    consultantName: string;
    bookingId: string;
    cancelledBy: "client" | "admin";
  }): Promise<void>;

  sendPaymentReceipt(params: {
    clientEmail: string;
    clientName: string;
    amountJPY: number;
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
