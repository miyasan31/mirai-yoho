import crypto from "node:crypto";
import { isValidSlotRange } from "@mirai-yoho/shared/slot-availability";
import { AppError } from "@/application/shared/app-error";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";
import { Slot } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import { TimeRange } from "@/domain/slot/time-range";

interface CreateSlotInput {
  organizationId: string;
  consultantId: string;
  startsAt: Date;
  endsAt: Date;
}

interface CreateSlotOutput {
  slotId: string;
}

export class CreateSlotUseCase {
  constructor(
    private readonly slotRepository: ISlotRepository,
    private readonly settingsRepository: ISettingsRepository,
  ) {}

  async execute(input: CreateSlotInput): Promise<CreateSlotOutput> {
    if (!isValidSlotRange(input.startsAt, input.endsAt)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Slots must be exactly 30 minutes and aligned to 30-minute boundaries",
      );
    }

    const settings =
      (await this.settingsRepository.findByOrganizationId(
        input.organizationId,
      )) ?? Settings.createDefault(input.organizationId);

    if (
      !settings.getBusinessHours().containsRange(input.startsAt, input.endsAt)
    ) {
      throw new AppError(
        400,
        "SLOT_OUTSIDE_BUSINESS_HOURS",
        "The selected slot is outside business hours",
      );
    }

    const newTimeRange = TimeRange.create(input.startsAt, input.endsAt);
    const existingSlots = await this.slotRepository.findByConsultantId(
      input.organizationId,
      input.consultantId,
    );
    const hasOverlap = existingSlots.some((existingSlot) =>
      existingSlot.getTimeRange().overlaps(newTimeRange),
    );
    if (hasOverlap) {
      throw new AppError(
        400,
        "SLOT_CONFLICT",
        "The selected slot overlaps an existing slot",
      );
    }

    const slotId = crypto.randomUUID();
    const slot = Slot.create({
      organizationId: input.organizationId,
      slotId,
      consultantId: input.consultantId,
      timeRange: newTimeRange,
    });
    await this.slotRepository.save(slot);
    return { slotId };
  }
}
