import {
  BusinessHours,
  type BusinessHoursProps,
} from "@mirai-yoho/shared/business-hours";
import type { PricePlanRangeProps } from "@/domain/settings/price-plan-range";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";
import type { ISlotRepository } from "@/domain/slot/slot-repository";

interface UpdateBookingSettingsInput {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours?: BusinessHoursProps;
  pricePlanRange?: PricePlanRangeProps;
}

export class UpdateBookingSettingsUseCase {
  constructor(
    private readonly settingsRepository: ISettingsRepository,
    private readonly slotRepository: ISlotRepository,
  ) {}

  async execute(input: UpdateBookingSettingsInput): Promise<Settings> {
    const { organizationId } = input;
    const existingSettings =
      await this.settingsRepository.findByOrganizationId(organizationId);

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

    const now = new Date();
    const allSlots =
      await this.slotRepository.findByOrganizationId(organizationId);
    const removableSlotIds = allSlots
      .filter((slot) => {
        if (slot.getIsAvailable()) return false;
        if (slot.getTimeRange().getStartsAt() <= now) return false;
        return !nextBusinessHours.containsRange(
          slot.getTimeRange().getStartsAt(),
          slot.getTimeRange().getEndsAt(),
        );
      })
      .map((slot) => slot.getSlotId());
    await Promise.all(
      removableSlotIds.map((slotId) =>
        this.slotRepository.delete(organizationId, slotId),
      ),
    );

    return settings;
  }
}
