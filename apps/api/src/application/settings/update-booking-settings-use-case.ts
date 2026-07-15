import {
  BusinessHours,
  type BusinessHoursProps,
} from "@mirai-yoho/shared/business-hours";
import { AppError } from "@/application/shared/app-error";
import type { PricePlanRangeProps } from "@/domain/settings/price-plan-range";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

interface UpdateBookingSettingsInput {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours?: BusinessHoursProps;
  pricePlanRange?: PricePlanRangeProps;
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MIN_EXCEPTION_LEAD_DAYS = 7;

function jstDateStringAfterDays(days: number): string {
  const jstMs = Date.now() + JST_OFFSET_MS + days * 24 * 60 * 60 * 1000;
  const jstDate = new Date(jstMs);
  const year = jstDate.getUTCFullYear();
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jstDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export class UpdateBookingSettingsUseCase {
  constructor(private readonly settingsRepository: ISettingsRepository) {}

  async execute(input: UpdateBookingSettingsInput): Promise<Settings> {
    const { organizationId } = input;
    const existingSettings =
      await this.settingsRepository.findByOrganizationId(organizationId);

    if (input.businessHours) {
      this.validateNewExceptionsLeadTime(
        input.businessHours.exceptions,
        existingSettings,
      );
    }

    const settings = existingSettings ?? Settings.createDefault(organizationId);
    const nextBusinessHours = BusinessHours.create(
      input.businessHours ?? settings.getBusinessHours().toJSON(),
    );
    const nextPricePlanRange =
      input.pricePlanRange ?? settings.getPricePlanRange().toJSON();

    settings.updateConsultantSelectionEnabled(input.consultantSelectionEnabled);
    settings.updateBusinessHours(nextBusinessHours.toJSON());
    settings.updatePricePlanRange(nextPricePlanRange);

    await this.settingsRepository.save(settings);

    return settings;
  }

  private validateNewExceptionsLeadTime(
    inputExceptions: BusinessHoursProps["exceptions"],
    existingSettings: Settings | null,
  ): void {
    const existingStartDates = new Set(
      existingSettings
        ?.getBusinessHours()
        .toJSON()
        .exceptions.map((exception) => exception.startDate) ?? [],
    );
    const threshold = jstDateStringAfterDays(MIN_EXCEPTION_LEAD_DAYS);
    for (const exception of inputExceptions) {
      if (existingStartDates.has(exception.startDate)) continue;
      if (exception.startDate < threshold) {
        throw new AppError(
          400,
          "EXCEPTION_DATE_TOO_SOON",
          `New business hours exception must start on or after ${threshold} (at least ${MIN_EXCEPTION_LEAD_DAYS} days ahead in JST)`,
        );
      }
    }
  }
}
