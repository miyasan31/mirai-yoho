import { AppError } from "@/application/shared/app-error";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { IUserRepository } from "@/domain/user/user-repository";

interface LinkExistingCustomersToUserInput {
  authUid: string;
}

interface LinkExistingCustomersToUserOutput {
  linkedCount: number;
}

export class LinkExistingCustomersToUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(
    input: LinkExistingCustomersToUserInput,
  ): Promise<LinkExistingCustomersToUserOutput> {
    const user = await this.userRepository.findByAuthUid(input.authUid);
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    const primaryEmail = user.getPrimaryEmail();
    if (!primaryEmail) {
      return { linkedCount: 0 };
    }

    const candidates =
      await this.customerRepository.findByEmailAcrossOrganizations(
        primaryEmail,
      );
    const userId = user.getUserId();

    const targets = candidates.filter((customer) => {
      const linked = customer.getUserId();
      return linked === undefined && !customer.isWithdrawn();
    });

    await Promise.all(
      targets.map((customer) => {
        customer.linkUser(userId);
        return this.customerRepository.save(customer);
      }),
    );

    return { linkedCount: targets.length };
  }
}
