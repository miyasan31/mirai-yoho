import type { PolicyRevision } from "@/domain/policy/policy-revision";
import type { PolicyType } from "@/domain/policy/policy-type";

export interface IPolicyRevisionRepository {
  findById(revisionId: string): Promise<PolicyRevision | null>;
  listByOrganizationAndType(
    organizationId: string,
    type: PolicyType,
  ): Promise<PolicyRevision[]>;
  findLatestPublished(
    organizationId: string,
    type: PolicyType,
    at: Date,
  ): Promise<PolicyRevision | null>;
  save(revision: PolicyRevision): Promise<void>;
}
