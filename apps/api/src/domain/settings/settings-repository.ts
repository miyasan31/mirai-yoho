import type { Settings } from "@/domain/settings/settings";

export interface ISettingsRepository {
  findByOrganizationId(organizationId: string): Promise<Settings | null>;
  save(settings: Settings): Promise<void>;
}
