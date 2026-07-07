export interface UserContact {
  uid: string;
  email: string;
}

export interface IUserContactService {
  findByUids(uids: string[]): Promise<Map<string, UserContact>>;
}
