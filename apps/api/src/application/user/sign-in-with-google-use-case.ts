import { BirthDate } from "@/domain/user/birth-date";
import { User } from "@/domain/user/user";
import type { IUserRepository } from "@/domain/user/user-repository";

interface SignInWithGoogleInput {
  authUid: string;
  providerUid: string;
  primaryEmail: string;
  displayName: string;
  birthDate: string;
}

interface SignInWithGoogleOutput {
  userId: string;
  isNew: boolean;
}

export class SignInWithGoogleUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: SignInWithGoogleInput): Promise<SignInWithGoogleOutput> {
    const existing = await this.userRepository.findByAuthUid(input.authUid);
    if (existing) {
      return { userId: existing.getUserId(), isNew: false };
    }

    const userId = crypto.randomUUID();
    const birthDate = BirthDate.create(input.birthDate, new Date());
    const user = User.createWithGoogle({
      userId,
      authUid: input.authUid,
      providerUid: input.providerUid,
      primaryEmail: input.primaryEmail,
      displayName: input.displayName,
      birthDate,
    });

    await this.userRepository.save(user);
    return { userId, isNew: true };
  }
}
