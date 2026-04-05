import { OrganizationSettings } from "@/domain/organization-settings/organization-settings";
import type { IOrganizationSettingsRepository } from "@/domain/organization-settings/organization-settings-repository";
import { db } from "@/infrastructure/firestore/firestore-client";

const COLLECTION = "organizationSettings";

interface OrganizationSettingsDoc {
  organizationId: string;
  consultantSelectionEnabled: boolean;
}

function toDomain(doc: OrganizationSettingsDoc): OrganizationSettings {
  return OrganizationSettings.reconstruct({
    organizationId: doc.organizationId,
    consultantSelectionEnabled: doc.consultantSelectionEnabled,
  });
}

function toFirestore(settings: OrganizationSettings): OrganizationSettingsDoc {
  return {
    organizationId: settings.getOrganizationId(),
    consultantSelectionEnabled: settings.getConsultantSelectionEnabled(),
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
