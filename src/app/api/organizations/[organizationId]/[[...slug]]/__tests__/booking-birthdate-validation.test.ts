import { validateClientBirthdate } from "../booking-birthdate-validation";

describe("validateClientBirthdate", () => {
  it("returns invalid when birthdate is missing", () => {
    expect(validateClientBirthdate(undefined)).toEqual({
      valid: false,
      errorMessage: "clientBirthdate is required",
    });
  });

  it("returns invalid when birthdate format is incorrect", () => {
    expect(validateClientBirthdate("1990/01/01")).toEqual({
      valid: false,
      errorMessage: "clientBirthdate must be in YYYY-MM-DD format",
    });
  });

  it("returns invalid when birthdate is not a real calendar date", () => {
    expect(validateClientBirthdate("1990-02-30")).toEqual({
      valid: false,
      errorMessage: "clientBirthdate must be in YYYY-MM-DD format",
    });
  });

  it("returns invalid when birthdate is in the future", () => {
    expect(validateClientBirthdate("2050-01-01")).toEqual({
      valid: false,
      errorMessage: "clientBirthdate cannot be in the future",
    });
  });

  it("returns valid for a valid past date", () => {
    expect(validateClientBirthdate("1990-01-01")).toEqual({
      valid: true,
    });
  });
});
