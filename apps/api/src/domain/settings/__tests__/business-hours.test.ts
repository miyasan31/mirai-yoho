import { BusinessHours } from "@mirai-yoho/shared/business-hours";

describe("business-hours", () => {
  it("default business hours contain 10:00-17:00 on weekdays", () => {
    const businessHours = BusinessHours.createDefault();
    const start = new Date("2026-05-01T01:00:00.000Z"); // JST 10:00
    const end = new Date("2026-05-01T01:30:00.000Z"); // JST 10:30
    expect(businessHours.containsRange(start, end)).toBe(true);
  });

  it("rejects range outside configured window", () => {
    const businessHours = BusinessHours.createDefault();
    const start = new Date("2026-05-01T00:00:00.000Z"); // JST 09:00
    const end = new Date("2026-05-01T00:30:00.000Z"); // JST 09:30
    expect(businessHours.containsRange(start, end)).toBe(false);
  });

  it("closes Japanese public holidays when includePublicHolidays is false", () => {
    const businessHours = BusinessHours.create({
      weekly: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        isClosed: false,
        timeWindows: [{ startTime: "10:00", endTime: "17:00" }],
      })),
      includePublicHolidays: false,
      exceptions: [],
    });
    const start = new Date("2026-01-01T01:00:00.000Z"); // JST 10:00 (holiday)
    const end = new Date("2026-01-01T01:30:00.000Z"); // JST 10:30
    expect(businessHours.containsRange(start, end)).toBe(false);
  });

  it("applies exception windows with highest priority", () => {
    const businessHours = BusinessHours.create({
      weekly: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        isClosed: false,
        timeWindows: [{ startTime: "10:00", endTime: "17:00" }],
      })),
      includePublicHolidays: false,
      exceptions: [
        {
          startDate: "2026-01-01",
          endDate: "2026-01-01",
          isClosed: false,
          timeWindows: [{ startTime: "12:00", endTime: "13:00" }],
        },
      ],
    });
    expect(
      businessHours.containsRange(
        new Date("2026-01-01T03:00:00.000Z"), // JST 12:00
        new Date("2026-01-01T03:30:00.000Z"), // JST 12:30
      ),
    ).toBe(true);
    expect(
      businessHours.containsRange(
        new Date("2026-01-01T01:00:00.000Z"), // JST 10:00
        new Date("2026-01-01T01:30:00.000Z"), // JST 10:30
      ),
    ).toBe(false);
  });
});
