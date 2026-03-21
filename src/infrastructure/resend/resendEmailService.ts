import type { IEmailService } from "@/application/shared/iEmailService";

export class ResendEmailService implements IEmailService {
  async sendBookingConfirmation(
    _params: {
      clientEmail: string;
      clientName: string;
      consultantName: string;
      zoomUrl: string;
      startDatetime: Date;
      bookingId: string;
    },
  ): Promise<void> {
    throw new Error("Not implemented");
  }

  async sendBookingCancellation(
    _params: {
      clientEmail: string;
      clientName: string;
      consultantName: string;
      bookingId: string;
      cancelledBy: "client" | "admin";
    },
  ): Promise<void> {
    throw new Error("Not implemented");
  }

  async sendPaymentReceipt(
    _params: {
      clientEmail: string;
      clientName: string;
      amountJPY: number;
      bookingId: string;
    },
  ): Promise<void> {
    throw new Error("Not implemented");
  }
}
