import {
  getBufferSlotCount,
  getSlotUnitMs,
  getUsageSlotCount,
  SUPPORTED_DURATION_MINUTES,
  type SupportedDurationMinutes,
} from "@mirai-yoho/shared/slot-availability";
import { createPricePlanSelectionId } from "@/domain/price-plan/price-plan";
import type { IPricePlanRepository } from "@/domain/price-plan/price-plan-repository";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";
import type { Slot } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";

interface ListBookingPricePlansInput {
  organizationId: string;
  startsAt: Date;
  consultantId?: string | null;
}

interface PublicPricePlanOutput {
  selectionId: string;
  name: string;
  totalJPY: number;
  durationMinutes: SupportedDurationMinutes;
  isAvailableAtStart: boolean;
}

interface ListBookingPricePlansOutput {
  pricePlans: PublicPricePlanOutput[];
}

function hasContinuousChain(
  availableSlots: readonly Slot[],
  startsAt: Date,
  requiredCount: number,
): boolean {
  const slotUnitMs = getSlotUnitMs();
  const sorted = [...availableSlots].sort(
    (a, b) =>
      a.getTimeRange().getStartsAt().getTime() -
      b.getTimeRange().getStartsAt().getTime(),
  );
  const startIndex = sorted.findIndex(
    (slot) =>
      slot.getTimeRange().getStartsAt().getTime() === startsAt.getTime(),
  );
  if (startIndex < 0) return false;
  for (let i = 0; i < requiredCount; i++) {
    const expected = startsAt.getTime() + i * slotUnitMs;
    const slot = sorted[startIndex + i];
    if (!slot) return false;
    if (slot.getTimeRange().getStartsAt().getTime() !== expected) return false;
    if (!slot.getIsAvailable()) return false;
  }
  return true;
}

export class ListBookingPricePlansUseCase {
  constructor(
    private readonly slotRepository: ISlotRepository,
    private readonly pricePlanRepository: IPricePlanRepository,
    private readonly settingsRepository: ISettingsRepository,
  ) {}

  async execute(
    input: ListBookingPricePlansInput,
  ): Promise<ListBookingPricePlansOutput> {
    const settings =
      (await this.settingsRepository.findByOrganizationId(
        input.organizationId,
      )) ?? Settings.createDefault(input.organizationId);
    const pricePlanRange = settings.getPricePlanRange();

    if (input.consultantId) {
      const availableSlots =
        await this.slotRepository.findAvailableByConsultantId(
          input.organizationId,
          input.consultantId,
        );
      const activePlans =
        await this.pricePlanRepository.findActiveByConsultantId(
          input.organizationId,
          input.consultantId,
        );
      const pricePlans = activePlans
        .filter((pricePlan) => pricePlanRange.contains(pricePlan.getTotalJPY()))
        .map((pricePlan) => {
          const totalRequired =
            getUsageSlotCount(pricePlan.getDurationMinutes()) +
            getBufferSlotCount();
          const isAvailableAtStart = hasContinuousChain(
            availableSlots,
            input.startsAt,
            totalRequired,
          );
          return {
            selectionId: createPricePlanSelectionId({
              name: pricePlan.getName(),
              durationMinutes: pricePlan.getDurationMinutes(),
              totalJPY: pricePlan.getTotalJPY(),
            }),
            name: pricePlan.getName(),
            totalJPY: pricePlan.getTotalJPY(),
            durationMinutes: pricePlan.getDurationMinutes(),
            isAvailableAtStart,
          };
        });
      return { pricePlans };
    }

    const dailySlots = await this.slotRepository.findAvailableByDate(
      input.organizationId,
      input.startsAt,
    );
    const slotsByConsultant = new Map<string, Slot[]>();
    for (const slot of dailySlots) {
      const list = slotsByConsultant.get(slot.getConsultantId()) ?? [];
      list.push(slot);
      slotsByConsultant.set(slot.getConsultantId(), list);
    }

    const consultantIds = [...slotsByConsultant.keys()];
    const plansByConsultant = await Promise.all(
      consultantIds.map((consultantId) =>
        this.pricePlanRepository.findActiveByConsultantId(
          input.organizationId,
          consultantId,
        ),
      ),
    );

    const uniquePlans = new Map<
      string,
      PublicPricePlanOutput & { consultantIds: string[] }
    >();
    for (let i = 0; i < consultantIds.length; i++) {
      const consultantId = consultantIds[i];
      for (const pricePlan of plansByConsultant[i]) {
        if (!pricePlanRange.contains(pricePlan.getTotalJPY())) continue;
        const selectionId = createPricePlanSelectionId({
          name: pricePlan.getName(),
          durationMinutes: pricePlan.getDurationMinutes(),
          totalJPY: pricePlan.getTotalJPY(),
        });
        const entry = uniquePlans.get(selectionId) ?? {
          selectionId,
          name: pricePlan.getName(),
          totalJPY: pricePlan.getTotalJPY(),
          durationMinutes: pricePlan.getDurationMinutes(),
          isAvailableAtStart: false,
          consultantIds: [],
        };
        entry.consultantIds.push(consultantId);
        uniquePlans.set(selectionId, entry);
      }
    }

    const pricePlans: PublicPricePlanOutput[] = [];
    for (const entry of uniquePlans.values()) {
      const totalRequired =
        getUsageSlotCount(entry.durationMinutes) + getBufferSlotCount();
      const isAvailableAtStart = entry.consultantIds.some((consultantId) => {
        const slots = slotsByConsultant.get(consultantId) ?? [];
        return hasContinuousChain(slots, input.startsAt, totalRequired);
      });
      pricePlans.push({
        selectionId: entry.selectionId,
        name: entry.name,
        totalJPY: entry.totalJPY,
        durationMinutes: entry.durationMinutes,
        isAvailableAtStart,
      });
    }

    return { pricePlans };
  }
}

export const AllSupportedDurations: readonly SupportedDurationMinutes[] =
  SUPPORTED_DURATION_MINUTES;
