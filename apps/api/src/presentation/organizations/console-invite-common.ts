import crypto from "node:crypto";
import { AppError } from "@/application/shared/app-error";
import { Account } from "@/domain/account/account";
import type { IAccountRepository } from "@/domain/account/account-repository";
import {
  createUser,
  generatePasswordResetLink,
  getUser,
  getUserByEmail,
} from "@/infrastructure/firebase/firebase-auth-admin";

export interface ProvisionInvitedAccountInput {
  organizationId: string;
  email: string;
  displayName: string;
  roleId: string;
  accountRepository: IAccountRepository;
}

export interface ProvisionInvitedAccountResult {
  accountId: string;
  passwordResetLink: string;
}

export async function provisionInvitedAccount(
  input: ProvisionInvitedAccountInput,
): Promise<ProvisionInvitedAccountResult> {
  const { organizationId, email, displayName, roleId, accountRepository } =
    input;

  let userRecord = await getUserByEmail(email).catch(() => null);
  let accountId: string;

  if (userRecord) {
    accountId = userRecord.uid;
    const existingAccount = await accountRepository.findById(
      organizationId,
      accountId,
    );
    if (existingAccount) {
      throw new AppError(
        409,
        "ACCOUNT_ALREADY_EXISTS",
        "このメールアドレスは既にこの組織に登録されています",
      );
    }
  } else {
    accountId = await createUser(email, crypto.randomUUID());
    userRecord = await getUser(accountId);
  }

  const account = Account.invite({
    organizationId,
    accountId,
    roleId,
    name: displayName,
  });
  if (userRecord.metadata.lastSignInTime) {
    account.activate();
  }
  await accountRepository.save(account);

  const passwordResetLink = await generatePasswordResetLink(email);
  return { accountId, passwordResetLink };
}
