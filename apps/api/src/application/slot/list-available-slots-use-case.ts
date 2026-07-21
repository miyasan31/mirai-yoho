import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";
import type { Slot } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";

interface ListAvailableSlotsInput {
  organizationId: string;
  consultantId: string;
}

interface AvailableSlotOutput {
  slotId: string;
  consultantId: string;
  startsAt: string;
  endsAt: string;
  isAvailable: boolean;
}

interface ListAvailableSlotsOutput {
  slots: AvailableSlotOutput[];
}

export class ListAvailableSlotsUseCase {
  constructor(
    private readonly slotRepository: ISlotRepository,
    private readonly settingsRepository: ISettingsRepository,
  ) {}

  async execute(
    input: ListAvailableSlotsInput,
  ): Promise<ListAvailableSlotsOutput> {
    const settings =
      (await this.settingsRepository.findByOrganizationId(
        input.organizationId,
      )) ?? Settings.createDefault(input.organizationId);
    const businessHours = settings.getBusinessHours();

    const availableSlots =
      await this.slotRepository.findAvailableByConsultantId(
        input.organizationId,
        input.consultantId,
      );
    const filteredSlots = availableSlots.filter((slot) =>
      businessHours.containsRange(
        slot.getTimeRange().getStartsAt(),
        slot.getTimeRange().getEndsAt(),
      ),
    );
    return {
      slots: filteredSlots.map(toAvailableSlotOutput),
    };
  }
}

function toAvailableSlotOutput(slot: Slot): AvailableSlotOutput {
  return {
    slotId: slot.getSlotId(),
    consultantId: slot.getConsultantId(),
    startsAt: slot.getTimeRange().getStartsAt().toISOString(),
    endsAt: slot.getTimeRange().getEndsAt().toISOString(),
    isAvailable: !slot.getIsAvailable(),
  };
}
