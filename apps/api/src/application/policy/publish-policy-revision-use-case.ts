import {
  type PolicyRevisionOutput,
  toPolicyRevisionOutput,
} from "@/application/policy/policy-output";
import { AppError } from "@/application/shared/app-error";
import type { IPolicyRevisionRepository } from "@/domain/policy/policy-revision-repository";

export interface PublishPolicyRevisionInput {
  organizationId: string;
  revisionId: string;
  effectiveFrom: Date;
}

export class PublishPolicyRevisionUseCase {
  constructor(
    private readonly policyRevisionRepository: IPolicyRevisionRepository,
  ) {}

  async execute(
    input: PublishPolicyRevisionInput,
  ): Promise<PolicyRevisionOutput> {
    const revision = await this.policyRevisionRepository.findById(
      input.revisionId,
    );
    if (!revision || revision.getOrganizationId() !== input.organizationId) {
      throw new AppError(
        404,
        "POLICY_REVISION_NOT_FOUND",
        "Policy revision not found",
      );
    }

    const siblings =
      await this.policyRevisionRepository.listByOrganizationAndType(
        revision.getOrganizationId(),
        revision.getType(),
      );

    revision.publish(input.effectiveFrom);
    await this.policyRevisionRepository.save(revision);

    // 新版が既に effective（effectiveFrom <= now）である場合のみ、
    // 既存の published 版を archived に遷移させる。
    // 未来日で公開した場合は前版を残しておかないと、
    // effectiveFrom が来るまで「現在有効な版なし」になってしまう。
    // 未来公開の場合、effectiveFrom が過ぎた後の archive は
    // findLatestPublished が effectiveFrom desc で新版を返すため semantic 上不要。
    const now = new Date();
    const isEffectiveImmediately =
      input.effectiveFrom.getTime() <= now.getTime();
    if (isEffectiveImmediately) {
      for (const sibling of siblings) {
        if (
          sibling.getRevisionId() !== revision.getRevisionId() &&
          sibling.isPublished()
        ) {
          sibling.archive();
          await this.policyRevisionRepository.save(sibling);
        }
      }
    }

    return toPolicyRevisionOutput(revision);
  }
}
