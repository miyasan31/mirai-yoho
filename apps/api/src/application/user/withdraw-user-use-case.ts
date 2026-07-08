import { AppError } from "@/application/shared/app-error";
import type { ITokenCipher } from "@/application/shared/token-cipher";
import type { IUnitOfWork } from "@/application/shared/unit-of-work";
import type { IUserZoomOAuthService } from "@/application/shared/zoom-user-oauth-service";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { IUserRepository } from "@/domain/user/user-repository";

interface WithdrawUserInput {
  authUid: string;
}

export interface IAuthAdminService {
  disableUser(authUid: string): Promise<void>;
}

export class WithdrawUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly oauthService: IUserZoomOAuthService,
    private readonly tokenCipher: ITokenCipher,
    private readonly authAdmin: IAuthAdminService,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: WithdrawUserInput): Promise<void> {
    const user = await this.userRepository.findByAuthUid(input.authUid);
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }
    if (!user.isActive()) {
      throw new AppError(409, "ALREADY_WITHDRAWN", "User is already withdrawn");
    }

    const connection = user.getZoomConnection();
    if (connection?.isActive()) {
      try {
        const accessToken = this.tokenCipher.decrypt(
          connection.getAccessTokenCipher(),
        );
        await this.oauthService.revokeToken(accessToken);
      } catch {
        // Zoom revoke 失敗は致命的ではない
      }
    }

    const now = new Date();
    user.withdraw(now);

    const customers = await this.customerRepository.findByUserId(
      user.getUserId(),
    );
    for (const customer of customers) {
      customer.mask(now);
    }

    await this.unitOfWork.runInTransaction(async () => {
      await this.userRepository.save(user);
      for (const customer of customers) {
        await this.customerRepository.save(customer);
      }
    });

    try {
      await this.authAdmin.disableUser(input.authUid);
    } catch {
      // Auth disable 失敗は記録のみ。再実行可能な状態にしておく
    }
  }
}
