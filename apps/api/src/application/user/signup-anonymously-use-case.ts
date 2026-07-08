import { AppError } from "@/application/shared/app-error";
import { BirthDate } from "@/domain/user/birth-date";
import { User } from "@/domain/user/user";
import type { IUserRepository } from "@/domain/user/user-repository";

interface SignupAnonymouslyInput {
  authUid: string;
  displayName: string;
  birthDate: string;
}

interface SignupAnonymouslyOutput {
  userId: string;
}

export class SignupAnonymouslyUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(
    input: SignupAnonymouslyInput,
  ): Promise<SignupAnonymouslyOutput> {
    const existing = await this.userRepository.findByAuthUid(input.authUid);
    if (existing) {
      throw new AppError(
        409,
        "USER_ALREADY_EXISTS",
        "User already exists for this auth uid",
      );
    }

    const userId = crypto.randomUUID();
    const birthDate = BirthDate.create(input.birthDate, new Date());
    const user = User.createAnonymous({
      userId,
      authUid: input.authUid,
      displayName: input.displayName,
      birthDate,
    });

    await this.userRepository.save(user);
    return { userId };
  }
}
