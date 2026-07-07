import type {
  IUserContactService,
  UserContact,
} from "@/application/shared/user-contact-service";
import { getUsersByUids } from "@/infrastructure/firebase/firebase-auth-admin";

export class FirebaseUserContactService implements IUserContactService {
  async findByUids(uids: string[]): Promise<Map<string, UserContact>> {
    const userByUid = await getUsersByUids(uids);
    const contactByUid = new Map<string, UserContact>();

    for (const [uid, userRecord] of userByUid) {
      contactByUid.set(uid, {
        uid,
        email: userRecord.email ?? "",
      });
    }

    return contactByUid;
  }
}
