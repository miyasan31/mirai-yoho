import type {
  IUserContactService,
  UserContact,
} from "@/application/shared/user-contact-service";
import { getUsersByUids } from "@/infrastructure/firebase/firebase-auth-admin";

export class FirebaseUserContactService implements IUserContactService {
  async findByUids(uids: string[]): Promise<Map<string, UserContact>> {
    const userByAuthUid = await getUsersByUids(uids);
    const contactByAuthUid = new Map<string, UserContact>();

    for (const [authUid, userRecord] of userByAuthUid) {
      contactByAuthUid.set(authUid, {
        authUid,
        email: userRecord.email ?? "",
      });
    }

    return contactByAuthUid;
  }
}
