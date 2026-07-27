import { AppError } from "@/application/shared/app-error";
import { BirthDate } from "@/domain/user/birth-date";
import type { IUserRepository } from "@/domain/user/user-repository";

interface UpdateUserProfileInput {
  authUid: string;
  displayName?: string;
  primaryEmail?: string;
  phoneNumber?: string;
  birthDate?: string;
}

export class UpdateUserProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: UpdateUserProfileInput): Promise<void> {
    const user = await this.userRepository.findByAuthUid(input.authUid);
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    const birthDate = input.birthDate
      ? BirthDate.create(input.birthDate, new Date())
      : undefined;

    user.updateProfile({
      displayName: input.displayName,
      primaryEmail: input.primaryEmail,
      phoneNumber: input.phoneNumber,
      birthDate,
    });

    await this.userRepository.save(user);
  }
}
