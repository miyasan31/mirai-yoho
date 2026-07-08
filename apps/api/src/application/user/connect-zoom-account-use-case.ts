import { AppError } from "@/application/shared/app-error";
import type { ITokenCipher } from "@/application/shared/token-cipher";
import type { IUserZoomOAuthService } from "@/application/shared/zoom-user-oauth-service";
import type { IUserRepository } from "@/domain/user/user-repository";
import { UserZoomConnection } from "@/domain/user/user-zoom-connection";

interface ConnectZoomAccountInput {
  authUid: string;
  code: string;
  redirectUri: string;
}

export class ConnectZoomAccountUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly oauthService: IUserZoomOAuthService,
    private readonly tokenCipher: ITokenCipher,
  ) {}

  async execute(input: ConnectZoomAccountInput): Promise<void> {
    const user = await this.userRepository.findByAuthUid(input.authUid);
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    const tokens = await this.oauthService.exchangeCode({
      code: input.code,
      redirectUri: input.redirectUri,
    });
    const zoomUser = await this.oauthService.fetchUser(tokens.accessToken);

    const connection = UserZoomConnection.create({
      zoomUserId: zoomUser.zoomUserId,
      zoomEmail: zoomUser.zoomEmail,
      accessTokenCipher: this.tokenCipher.encrypt(tokens.accessToken),
      refreshTokenCipher: this.tokenCipher.encrypt(tokens.refreshToken),
      accessTokenExpiresAt: new Date(
        Date.now() + tokens.expiresInSeconds * 1000,
      ),
      scopes: tokens.scopes,
      connectedAt: new Date(),
    });

    user.connectZoom(connection);
    await this.userRepository.save(user);
  }
}
