export interface LateArrivalAlertParams {
  organizationId: string;
  bookingId: string;
  consultantName: string;
  consultantEmail: string;
  consultantPhone: string;
  clientName: string;
  startDatetime: Date;
  elapsedMinutes: number;
  adminBookingsUrl: string;
}

export interface ILateArrivalAlertService {
  sendLateArrivalAlert(params: LateArrivalAlertParams): Promise<void>;
}
