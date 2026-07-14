export interface UserContact {
  authUid: string;
  email: string;
}

export interface IUserContactService {
  findByUids(uids: string[]): Promise<Map<string, UserContact>>;
}
