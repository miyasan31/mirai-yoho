import type { IAuthAdminService } from "@/application/user/withdraw-user-use-case";
import { disableUser } from "@/infrastructure/firebase/firebase-auth-admin";

export class FirebaseAuthAdminService implements IAuthAdminService {
  async disableUser(authUid: string): Promise<void> {
    await disableUser(authUid);
  }
}
