import type { DomainEvent } from "@/domain/shared/domain-event";

export class UserWithdrawnEvent implements DomainEvent {
  readonly eventName = "UserWithdrawn";
  readonly occurredAt: Date;
  readonly payload: {
    userId: string;
    authUid: string;
    withdrawnAt: Date;
  };

  private constructor(payload: UserWithdrawnEvent["payload"]) {
    this.occurredAt = new Date();
    this.payload = payload;
  }

  static create(payload: UserWithdrawnEvent["payload"]): UserWithdrawnEvent {
    return new UserWithdrawnEvent(payload);
  }
}
