import { BusinessHours } from "@mirai-yoho/shared/business-hours";
import type { ConsultantStatusProps } from "@/domain/settings/consultant-status";
import { PricePlanRange } from "@/domain/settings/price-plan-range";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.settings;

interface SettingsDoc {
  organizationId: string;
  businessHours?: ReturnType<BusinessHours["toJSON"]>;
  consultantStatuses?: ConsultantStatusProps[];
  defaultConsultantStatusId?: string;
  pricePlanRange?: ReturnType<PricePlanRange["toJSON"]>;
}

function toDomain(doc: SettingsDoc): Settings {
  return Settings.reconstruct({
    organizationId: doc.organizationId,
    businessHours: doc.businessHours ?? BusinessHours.createDefault().toJSON(),
    consultantStatuses: doc.consultantStatuses,
    defaultConsultantStatusId: doc.defaultConsultantStatusId,
    pricePlanRange:
      doc.pricePlanRange ?? PricePlanRange.createDefault().toJSON(),
  });
}

function toFirestore(settings: Settings): SettingsDoc {
  return {
    organizationId: settings.getOrganizationId(),
    businessHours: settings.getBusinessHours().toJSON(),
    consultantStatuses: settings.getConsultantStatuses(),
    defaultConsultantStatusId: settings.getDefaultConsultantStatusId(),
    pricePlanRange: settings.getPricePlanRange().toJSON(),
  };
}

export class FirestoreSettingsRepository implements ISettingsRepository {
  async findByOrganizationId(organizationId: string): Promise<Settings | null> {
    const doc = await db.collection(COLLECTION).doc(organizationId).get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as SettingsDoc);
  }

  async save(settings: Settings): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(settings.getOrganizationId())
      .set(toFirestore(settings));
  }
}
