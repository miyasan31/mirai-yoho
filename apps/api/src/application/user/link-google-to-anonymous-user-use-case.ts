import { AppError } from "@/application/shared/app-error";
import { AuthProvider } from "@/domain/user/auth-provider";
import type { IUserRepository } from "@/domain/user/user-repository";

interface LinkGoogleToAnonymousUserInput {
  authUid: string;
  providerUid: string;
  primaryEmail: string;
}

export class LinkGoogleToAnonymousUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: LinkGoogleToAnonymousUserInput): Promise<void> {
    const user = await this.userRepository.findByAuthUid(input.authUid);
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    user.linkProvider(
      AuthProvider.create({
        providerId: "google.com",
        providerUid: input.providerUid,
        linkedAt: new Date(),
      }),
    );
    user.updateProfile({ primaryEmail: input.primaryEmail });

    await this.userRepository.save(user);
  }
}
