import type { OrganizationSettings } from "@/domain/organization-settings/organization-settings";

export interface IOrganizationSettingsRepository {
  findByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationSettings | null>;
  save(settings: OrganizationSettings): Promise<void>;
}
