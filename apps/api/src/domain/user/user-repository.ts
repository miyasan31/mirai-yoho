import type { User } from "@/domain/user/user";

export interface IUserRepository {
  findById(userId: string): Promise<User | null>;
  findByAuthUid(authUid: string): Promise<User | null>;
  findByPrimaryEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
