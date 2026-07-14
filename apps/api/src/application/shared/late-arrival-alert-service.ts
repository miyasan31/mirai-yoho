export interface LateArrivalAlertParams {
  organizationId: string;
  bookingId: string;
  consultantName: string;
  consultantEmail: string;
  consultantPhone: string;
  customerName: string;
  startsAt: Date;
  elapsedMinutes: number;
  consoleBookingsUrl: string;
}

export interface ILateArrivalAlertService {
  sendLateArrivalAlert(params: LateArrivalAlertParams): Promise<void>;
}
