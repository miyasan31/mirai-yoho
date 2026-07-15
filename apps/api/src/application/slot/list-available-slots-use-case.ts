import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";
import type { Slot } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";

interface ListAvailableSlotsInput {
  organizationId: string;
  consultantId?: string | null;
}

interface AvailableSlotOutput {
  slotId: string;
  consultantId: string;
  startsAt: string;
  endsAt: string;
  isAvailable: boolean;
}

interface AggregatedSlotOutput {
  startsAt: string;
  endsAt: string;
}

interface ListAvailableSlotsPerConsultantOutput {
  mode: "per-consultant";
  slots: AvailableSlotOutput[];
}

interface ListAvailableSlotsAggregatedOutput {
  mode: "aggregated";
  aggregatedSlots: AggregatedSlotOutput[];
}

type ListAvailableSlotsOutput =
  | ListAvailableSlotsPerConsultantOutput
  | ListAvailableSlotsAggregatedOutput;

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

    if (input.consultantId) {
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
        mode: "per-consultant",
        slots: filteredSlots.map(toAvailableSlotOutput),
      };
    }

    const aggregatedSlots = await this.slotRepository.findAllAvailable(
      input.organizationId,
    );
    const groupedSlots = new Map<string, AggregatedSlotOutput>();
    for (const slot of aggregatedSlots) {
      if (
        !businessHours.containsRange(
          slot.getTimeRange().getStartsAt(),
          slot.getTimeRange().getEndsAt(),
        )
      ) {
        continue;
      }
      const startsAt = slot.getTimeRange().getStartsAt().toISOString();
      const endsAt = slot.getTimeRange().getEndsAt().toISOString();
      const key = `${startsAt}_${endsAt}`;
      if (!groupedSlots.has(key)) {
        groupedSlots.set(key, { startsAt, endsAt });
      }
    }
    return {
      mode: "aggregated",
      aggregatedSlots: [...groupedSlots.values()],
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
