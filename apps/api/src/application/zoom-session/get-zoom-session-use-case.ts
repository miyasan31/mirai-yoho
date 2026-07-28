import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import { ZoomSession } from "@/domain/zoom-session/zoom-session";
import type { IZoomSessionRepository } from "@/domain/zoom-session/zoom-session-repository";

interface GetZoomSessionInput {
  organizationId: string;
  /** JST の YYYY-MM-DD。省略時は当日 */
  sessionDate?: string;
}

interface BreakoutRoomView {
  bookingId: string;
  roomName: string;
  consultantId: string;
  consultantName: string | null;
  customerId: string | null;
  customerName: string | null;
  /** ブレイクアウトルームに事前割り当てされている Zoom アカウントのメール */
  customerEmail: string;
  startsAt: string | null;
  endsAt: string | null;
  bookingStatus: string | null;
  /**
   * 予約が存在しない、または confirmed でないのにルームが残っている状態。
   * 予約作成・キャンセル時の Zoom 連携が途中で失敗した可能性を示す
   */
  isStale: boolean;
}

interface GetZoomSessionOutput {
  sessionDate: string;
  zoomMeetingId: string | null;
  joinUrl: string | null;
  breakoutRooms: BreakoutRoomView[];
}

export class GetZoomSessionUseCase {
  constructor(
    private readonly zoomSessionRepository: IZoomSessionRepository,
    private readonly bookingRepository: IBookingRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly consultantRepository: IConsultantRepository,
  ) {}

  async execute(input: GetZoomSessionInput): Promise<GetZoomSessionOutput> {
    const sessionDate =
      input.sessionDate ?? ZoomSession.sessionDateFromInstant(new Date());

    const session = await this.zoomSessionRepository.findByDate(
      input.organizationId,
      sessionDate,
    );
    if (!session) {
      return {
        sessionDate,
        zoomMeetingId: null,
        joinUrl: null,
        breakoutRooms: [],
      };
    }

    const breakoutRooms = await Promise.all(
      session.getBreakoutRooms().map(async (room) => {
        const [booking, consultant] = await Promise.all([
          this.bookingRepository.findById(
            input.organizationId,
            room.getBookingId(),
          ),
          this.consultantRepository.findById(
            input.organizationId,
            room.getConsultantId(),
          ),
        ]);

        const customer = booking
          ? await this.customerRepository.findById(
              input.organizationId,
              booking.getCustomerId(),
            )
          : null;
        const bookingStatus = booking?.getStatus().getValue() ?? null;

        return {
          bookingId: room.getBookingId(),
          roomName: room.getRoomName(),
          consultantId: room.getConsultantId(),
          consultantName: consultant?.getProfile().getDisplayName() ?? null,
          customerId: booking?.getCustomerId() ?? null,
          customerName: customer?.getName() ?? null,
          customerEmail: room.getCustomerEmail(),
          startsAt: booking?.getStartsAt().toISOString() ?? null,
          endsAt: booking?.getEndsAt().toISOString() ?? null,
          bookingStatus,
          isStale: bookingStatus !== "confirmed",
        };
      }),
    );

    return {
      sessionDate,
      zoomMeetingId: session.getZoomMeetingId() || null,
      joinUrl: session.getJoinUrl() || null,
      breakoutRooms: breakoutRooms.sort((a, b) =>
        (a.startsAt ?? "").localeCompare(b.startsAt ?? ""),
      ),
    };
  }
}
