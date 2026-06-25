import { validateCustomerBirthdate } from "../booking-birthdate-validation";

describe("validateCustomerBirthdate", () => {
  it("returns invalid when birthDate is missing", () => {
    expect(validateCustomerBirthdate(undefined)).toEqual({
      valid: false,
      errorMessage: "customerBirthDate is required",
    });
  });

  it("returns invalid when birthDate format is incorrect", () => {
    expect(validateCustomerBirthdate("1990/01/01")).toEqual({
      valid: false,
      errorMessage: "customerBirthDate must be in YYYY-MM-DD format",
    });
  });

  it("returns invalid when birthDate is not a real calendar date", () => {
    expect(validateCustomerBirthdate("1990-02-30")).toEqual({
      valid: false,
      errorMessage: "customerBirthDate must be in YYYY-MM-DD format",
    });
  });

  it("returns invalid when birthDate is in the future", () => {
    expect(validateCustomerBirthdate("2050-01-01")).toEqual({
      valid: false,
      errorMessage: "customerBirthDate cannot be in the future",
    });
  });

  it("returns valid for a valid past date", () => {
    expect(validateCustomerBirthdate("1990-01-01")).toEqual({
      valid: true,
    });
  });
});
