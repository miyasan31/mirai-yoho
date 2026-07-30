import { AppError } from "@/application/shared/app-error";
import type { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { Payment } from "@/domain/payment/payment";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";
import { DEFAULT_SETTLEMENT_RATE_PERCENT } from "@/domain/settings/consultant-status";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";
import { calculateSettlement } from "@/domain/settlement/settlement-calculation";
import {
  isWithinSettlementPeriod,
  resolveSettlementPeriod,
} from "@/domain/settlement/settlement-period";

export interface GetConsultantSettlementStatementInput {
  organizationId: string;
  consultantId: string;
  /** 対象月（YYYY-MM） */
  month: string;
  usesOfficeAddress: boolean;
}

export interface SettlementStatementItemOutput {
  bookingId: string;
  startsAt: string;
  endsAt: string;
  customerName: string | null;
  pricePlanName: string | null;
  amountJPY: number;
}

export interface SettlementStatementOutput {
  month: string;
  issuedAt: string;
  issuedTo: {
    companyName: string;
    address: string;
  };
  issuer: {
    name: string;
    /** 事務所を住所として利用する場合のみ運営の事務所所在地が入る */
    address: string | null;
  };
  consultantStatusName: string | null;
  usesOfficeAddress: boolean;
  items: SettlementStatementItemOutput[];
  grossJPY: number;
  systemFeeRatePercent: number;
  systemFeeJPY: number;
  systemFeeTaxJPY: number;
  officeFeeJPY: number;
  settlementAmountJPY: number;
}

export class GetConsultantSettlementStatementUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly consultantRepository: IConsultantRepository,
    private readonly settingsRepository: ISettingsRepository,
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(
    input: GetConsultantSettlementStatementInput,
  ): Promise<SettlementStatementOutput> {
    const { organizationId, consultantId, month, usesOfficeAddress } = input;
    const period = resolveSettlementPeriod(month);

    const consultant = await this.consultantRepository.findById(
      organizationId,
      consultantId,
    );
    if (!consultant) {
      throw new AppError(404, "CONSULTANT_NOT_FOUND", "Consultant not found");
    }

    const settings =
      await this.settingsRepository.findByOrganizationId(organizationId);
    // ステータスが削除済みなどで見つからない場合は既定ステータスにフォールバックする
    const consultantStatus =
      settings?.findConsultantStatus(consultant.getStatusId()) ??
      (settings
        ? settings.findConsultantStatus(settings.getDefaultConsultantStatusId())
        : null);
    const systemFeeRatePercent =
      consultantStatus?.settlementRatePercent ??
      DEFAULT_SETTLEMENT_RATE_PERCENT;
    const companyInfo = settings?.getCompanyInfo();

    const bookings = await this.collectPeriodBookings(
      organizationId,
      consultantId,
      period,
    );
    const paymentsByBookingId = await this.collectChargedPayments(
      organizationId,
      bookings,
    );

    const chargedBookings = bookings
      .filter((booking) => paymentsByBookingId.has(booking.getBookingId()))
      .sort((a, b) => a.getStartsAt().getTime() - b.getStartsAt().getTime());

    const customerNames = await this.collectCustomerNames(
      organizationId,
      chargedBookings,
    );

    const items = chargedBookings.map((booking) => {
      const payment = paymentsByBookingId.get(booking.getBookingId());
      return {
        bookingId: booking.getBookingId(),
        startsAt: booking.getStartsAt().toISOString(),
        endsAt: booking.getEndsAt().toISOString(),
        customerName: customerNames.get(booking.getCustomerId()) ?? null,
        pricePlanName: booking.getPricePlanName() ?? null,
        amountJPY: payment?.getMoney().getTotalJPY() ?? 0,
      };
    });

    const amounts = calculateSettlement({
      grossJPY: items.reduce((total, item) => total + item.amountJPY, 0),
      systemFeeRatePercent,
      usesOfficeAddress,
    });

    return {
      month: period.month,
      issuedAt: new Date().toISOString(),
      issuedTo: {
        companyName: companyInfo?.getCompanyName() ?? "",
        address: companyInfo?.getAddress() ?? "",
      },
      issuer: {
        name: consultant.getProfile().getDisplayName(),
        address: usesOfficeAddress
          ? (companyInfo?.getOfficeAddress() ?? "")
          : null,
      },
      consultantStatusName: consultantStatus?.name ?? null,
      usesOfficeAddress,
      items,
      ...amounts,
    };
  }

  private async collectPeriodBookings(
    organizationId: string,
    consultantId: string,
    period: ReturnType<typeof resolveSettlementPeriod>,
  ): Promise<Booking[]> {
    const bookings = await this.bookingRepository.findByConsultantId(
      organizationId,
      consultantId,
    );
    return bookings.filter(
      (booking) =>
        booking.getStatus().getValue() !== "cancelled" &&
        isWithinSettlementPeriod(period, booking.getStartsAt()),
    );
  }

  /** 借受金として計上できるのは実際に課金済み（charged）の決済のみ */
  private async collectChargedPayments(
    organizationId: string,
    bookings: Booking[],
  ): Promise<Map<string, Payment>> {
    if (bookings.length === 0) {
      return new Map();
    }
    const payments = await this.paymentRepository.findByBookingIds(
      organizationId,
      bookings.map((booking) => booking.getBookingId()),
    );
    return new Map(
      payments
        .filter((payment) => payment.getStatus().getValue() === "charged")
        .map((payment) => [payment.getBookingId(), payment]),
    );
  }

  private async collectCustomerNames(
    organizationId: string,
    bookings: Booking[],
  ): Promise<Map<string, string>> {
    if (bookings.length === 0) {
      return new Map();
    }
    const customerIds = [
      ...new Set(bookings.map((booking) => booking.getCustomerId())),
    ];
    const customers = await this.customerRepository.findByIds(
      organizationId,
      customerIds,
    );
    return new Map(
      customers.map((customer) => [
        customer.getCustomerId(),
        customer.getName(),
      ]),
    );
  }
}
