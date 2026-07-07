import { BusinessHours } from "@mirai-yoho/shared/business-hours";
import type { ConsultantStatusProps } from "@/domain/organization-settings/consultant-status";
import { OrganizationSettings } from "@/domain/organization-settings/organization-settings";
import type { IOrganizationSettingsRepository } from "@/domain/organization-settings/organization-settings-repository";
import { PricePlanRange } from "@/domain/organization-settings/price-plan-range";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.organizationSettings;

interface OrganizationSettingsDoc {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours?: ReturnType<BusinessHours["toJSON"]>;
  consultantStatuses?: ConsultantStatusProps[];
  defaultConsultantStatusId?: string;
  pricePlanRange?: ReturnType<PricePlanRange["toJSON"]>;
}

function toDomain(doc: OrganizationSettingsDoc): OrganizationSettings {
  return OrganizationSettings.reconstruct({
    organizationId: doc.organizationId,
    consultantSelectionEnabled: doc.consultantSelectionEnabled,
    businessHours: doc.businessHours ?? BusinessHours.createDefault().toJSON(),
    consultantStatuses: doc.consultantStatuses,
    defaultConsultantStatusId: doc.defaultConsultantStatusId,
    pricePlanRange:
      doc.pricePlanRange ?? PricePlanRange.createDefault().toJSON(),
  });
}

function toFirestore(settings: OrganizationSettings): OrganizationSettingsDoc {
  return {
    organizationId: settings.getOrganizationId(),
    consultantSelectionEnabled: settings.getConsultantSelectionEnabled(),
    businessHours: settings.getBusinessHours().toJSON(),
    consultantStatuses: settings.getConsultantStatuses(),
    defaultConsultantStatusId: settings.getDefaultConsultantStatusId(),
    pricePlanRange: settings.getPricePlanRange().toJSON(),
  };
}

export class FirestoreOrganizationSettingsRepository
  implements IOrganizationSettingsRepository
{
  async findByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationSettings | null> {
    const doc = await db.collection(COLLECTION).doc(organizationId).get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as OrganizationSettingsDoc);
  }

  async save(settings: OrganizationSettings): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(settings.getOrganizationId())
      .set(toFirestore(settings));
  }
}
