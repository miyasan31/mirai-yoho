import { DomainError } from "@mirai-yoho/shared/domain-error";
import { AuthProvider } from "@/domain/user/auth-provider";
import { BirthDate } from "@/domain/user/birth-date";
import { User } from "@/domain/user/user";
import { UserZoomConnection } from "@/domain/user/user-zoom-connection";

const REFERENCE_DATE = new Date("2026-07-01T00:00:00Z");

function birthDate(): BirthDate {
  return BirthDate.create("1990-01-01", REFERENCE_DATE);
}

function createAnonymousUser(): User {
  return User.createAnonymous({
    userId: "user-1",
    authUid: "auth-1",
    displayName: "テスト太郎",
    birthDate: birthDate(),
  });
}

function createGoogleUser(): User {
  return User.createWithGoogle({
    userId: "user-2",
    authUid: "auth-2",
    providerUid: "google-authUid-2",
    primaryEmail: "user2@example.com",
    displayName: "テスト次郎",
    birthDate: birthDate(),
  });
}

function makeZoomConnection(): UserZoomConnection {
  return UserZoomConnection.create({
    zoomUserId: "zoom-user-1",
    zoomEmail: "user1@zoom.example.com",
    accessTokenCipher: "cipher-access",
    refreshTokenCipher: "cipher-refresh",
    accessTokenExpiresAt: new Date("2026-07-01T01:00:00Z"),
    scopes: ["user:read"],
    connectedAt: new Date("2026-07-01T00:00:00Z"),
  });
}

describe("User", () => {
  describe("createAnonymous", () => {
    it("anonymous プロバイダーで作成される", () => {
      const user = createAnonymousUser();
      const providers = user.getAuthProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0].getProviderId()).toBe("anonymous");
      expect(user.getPrimaryEmail()).toBeUndefined();
      expect(user.isActive()).toBe(true);
    });
  });

  describe("createWithGoogle", () => {
    it("google.com プロバイダーで作成される", () => {
      const user = createGoogleUser();
      const providers = user.getAuthProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0].getProviderId()).toBe("google.com");
      expect(user.getPrimaryEmail()).toBe("user2@example.com");
    });
  });

  describe("linkProvider", () => {
    it("Google を後付けできる", () => {
      const user = createAnonymousUser();
      user.linkProvider(
        AuthProvider.create({
          providerId: "google.com",
          providerUid: "google-authUid",
          linkedAt: new Date(),
        }),
      );
      expect(user.getAuthProviders()).toHaveLength(2);
    });

    it("同じ provider を二重リンクは DomainError", () => {
      const user = createGoogleUser();
      expect(() =>
        user.linkProvider(
          AuthProvider.create({
            providerId: "google.com",
            providerUid: "google-authUid-2",
            linkedAt: new Date(),
          }),
        ),
      ).toThrow(DomainError);
    });

    it("退会済みユーザーには linkProvider できない", () => {
      const user = createGoogleUser();
      user.withdraw(new Date());
      expect(() =>
        user.linkProvider(
          AuthProvider.create({
            providerId: "line",
            providerUid: "line-authUid",
            linkedAt: new Date(),
          }),
        ),
      ).toThrow(DomainError);
    });
  });

  describe("updateProfile", () => {
    it("displayName / primaryEmail / birthDate を更新できる", () => {
      const user = createAnonymousUser();
      const newBirthDate = BirthDate.create("1985-01-01", REFERENCE_DATE);
      user.updateProfile({
        displayName: "改名",
        primaryEmail: "new@example.com",
        birthDate: newBirthDate,
      });
      expect(user.getDisplayName()).toBe("改名");
      expect(user.getPrimaryEmail()).toBe("new@example.com");
      expect(user.getBirthDate().getValue()).toBe("1985-01-01");
    });
  });

  describe("connectZoom / disconnectZoom", () => {
    it("Zoom 連携で hasActiveZoomConnection が true", () => {
      const user = createGoogleUser();
      user.connectZoom(makeZoomConnection());
      expect(user.hasActiveZoomConnection()).toBe(true);
      expect(user.getZoomEmail()).toBe("user1@zoom.example.com");
    });

    it("disconnectZoom 後は false", () => {
      const user = createGoogleUser();
      user.connectZoom(makeZoomConnection());
      user.disconnectZoom(new Date());
      expect(user.hasActiveZoomConnection()).toBe(false);
      expect(user.getZoomEmail()).toBeUndefined();
    });

    it("未接続で disconnectZoom は DomainError", () => {
      const user = createGoogleUser();
      expect(() => user.disconnectZoom(new Date())).toThrow(DomainError);
    });
  });

  describe("withdraw", () => {
    it("status が withdrawn になる", () => {
      const user = createGoogleUser();
      user.withdraw(new Date());
      expect(user.isActive()).toBe(false);
      expect(user.getStatus()).toBe("withdrawn");
    });

    it("UserWithdrawnEvent が発行される", () => {
      const user = createGoogleUser();
      user.withdraw(new Date());
      const events = user.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe("UserWithdrawn");
    });

    it("Zoom 連携も自動 revoke される", () => {
      const user = createGoogleUser();
      user.connectZoom(makeZoomConnection());
      user.withdraw(new Date());
      expect(user.getZoomConnection()?.isActive()).toBe(false);
    });

    it("二重退会は DomainError", () => {
      const user = createGoogleUser();
      user.withdraw(new Date());
      expect(() => user.withdraw(new Date())).toThrow(DomainError);
    });
  });
});
