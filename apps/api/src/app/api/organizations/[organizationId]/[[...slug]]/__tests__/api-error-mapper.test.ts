import { DomainError } from "@mirai-yoho/shared/domain-error";
import { AppError } from "@/application/shared/app-error";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { logUnexpectedPostError, mapApiError } from "../api-error-mapper";

describe("api-error-mapper", () => {
  it("maps app error with its status/code/message", () => {
    const mapped = mapApiError(
      new AppError(
        502,
        "ZOOM_INTEGRATION_ERROR",
        "Zoom integration failed. Please try again later.",
      ),
    );

    expect(mapped).toEqual({
      status: 502,
      code: "ZOOM_INTEGRATION_ERROR",
      message: "Zoom integration failed. Please try again later.",
    });
  });

  it("maps unknown error to internal error", () => {
    const mapped = mapApiError(new Error("unexpected"));

    expect(mapped).toEqual({
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  });

  it("does not log handled errors", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    logUnexpectedPostError(new DomainError("SLOT_CONFLICT", "slot conflict"), {
      endpoint: "POST /api/organizations/org-1/bookings",
      organizationId: "org-1",
      segments: ["bookings"],
    });
    logUnexpectedPostError(
      new AppError(502, "EMAIL_DELIVERY_ERROR", "mail error"),
      {
        endpoint: "POST /api/organizations/org-1/bookings",
        organizationId: "org-1",
        segments: ["bookings"],
      },
    );
    logUnexpectedPostError(new AuthError(401, "UNAUTHORIZED", "Unauthorized"), {
      endpoint: "POST /api/organizations/org-1/bookings",
      organizationId: "org-1",
      segments: ["bookings"],
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("logs unhandled errors with context", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    logUnexpectedPostError(new Error("unexpected"), {
      endpoint: "POST /api/organizations/org-1/bookings",
      organizationId: "org-1",
      segments: ["bookings", "id", "setup-payment"],
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Unhandled POST /organizations API error",
      expect.objectContaining({
        endpoint: "POST /api/organizations/org-1/bookings",
        organizationId: "org-1",
        segments: ["bookings", "id", "setup-payment"],
      }),
    );
    consoleErrorSpy.mockRestore();
  });
});
