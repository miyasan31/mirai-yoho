import { AppError } from "@/application/shared/app-error";
import type { ITokenCipher } from "@/application/shared/token-cipher";
import type { IUserZoomOAuthService } from "@/application/shared/zoom-user-oauth-service";
import type { IUserRepository } from "@/domain/user/user-repository";

interface DisconnectZoomAccountInput {
  authUid: string;
}

export class DisconnectZoomAccountUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly oauthService: IUserZoomOAuthService,
    private readonly tokenCipher: ITokenCipher,
  ) {}

  async execute(input: DisconnectZoomAccountInput): Promise<void> {
    const user = await this.userRepository.findByAuthUid(input.authUid);
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    const connection = user.getZoomConnection();
    if (connection?.isActive()) {
      try {
        const accessToken = this.tokenCipher.decrypt(
          connection.getAccessTokenCipher(),
        );
        await this.oauthService.revokeToken(accessToken);
      } catch {
        // Zoom 側の revoke 失敗は致命的ではない。ローカル状態は次のステップで revoke する
      }
    }

    user.disconnectZoom(new Date());
    await this.userRepository.save(user);
  }
}
