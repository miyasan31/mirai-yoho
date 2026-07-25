import { BusinessHours } from "@mirai-yoho/shared/business-hours";
import { DomainError } from "@mirai-yoho/shared/domain-error";

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

  describe("business day (5:00 anchor)", () => {
    // 2026-05-04 is a Monday. Weekly index: Mon = 1.
    function nightShiftBusinessHours(): BusinessHours {
      return BusinessHours.create({
        weekly: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          isClosed: false,
          timeWindows: [{ startTime: "20:00", endTime: "04:00" }],
        })),
        includePublicHolidays: true,
        exceptions: [],
      });
    }

    it("accepts 20:00-04:00 (crosses midnight, same business day)", () => {
      expect(() => nightShiftBusinessHours()).not.toThrow();
    });

    it("accepts 24-hour operation (start === end)", () => {
      expect(() =>
        BusinessHours.create({
          weekly: Array.from({ length: 7 }, (_, dayOfWeek) => ({
            dayOfWeek,
            isClosed: false,
            timeWindows: [{ startTime: "05:00", endTime: "05:00" }],
          })),
          includePublicHolidays: true,
          exceptions: [],
        }),
      ).not.toThrow();
    });

    it("rejects 04:00-06:00 (crosses business day boundary at 05:00)", () => {
      expect(() =>
        BusinessHours.create({
          weekly: [
            {
              dayOfWeek: 1,
              isClosed: false,
              timeWindows: [{ startTime: "04:00", endTime: "06:00" }],
            },
          ],
          includePublicHolidays: true,
          exceptions: [],
        }),
      ).toThrow(DomainError);
    });

    it("rejects a 24h window that coexists with another window", () => {
      expect(() =>
        BusinessHours.create({
          weekly: [
            {
              dayOfWeek: 1,
              isClosed: false,
              timeWindows: [
                { startTime: "05:00", endTime: "05:00" },
                { startTime: "10:00", endTime: "12:00" },
              ],
            },
          ],
          includePublicHolidays: true,
          exceptions: [],
        }),
      ).toThrow(DomainError);
    });

    it("containsRange spans midnight within the same business day", () => {
      const businessHours = nightShiftBusinessHours();
      // Mon (2026-05-04) 22:00-23:00 JST -> Mon business day, within 20:00-04:00
      const start = new Date("2026-05-04T13:00:00.000Z"); // JST Mon 22:00
      const end = new Date("2026-05-04T14:00:00.000Z"); // JST Mon 23:00
      expect(businessHours.containsRange(start, end)).toBe(true);
    });

    it("containsRange covers post-midnight portion of previous business day", () => {
      const businessHours = nightShiftBusinessHours();
      // Tue (2026-05-05) 02:00-03:00 JST -> still Mon business day
      const start = new Date("2026-05-04T17:00:00.000Z"); // JST Tue 02:00
      const end = new Date("2026-05-04T18:00:00.000Z"); // JST Tue 03:00
      expect(businessHours.containsRange(start, end)).toBe(true);
    });

    it("containsRange rejects slots spanning business day boundary", () => {
      const businessHours = BusinessHours.create({
        weekly: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          isClosed: false,
          timeWindows: [{ startTime: "05:00", endTime: "05:00" }],
        })),
        includePublicHolidays: true,
        exceptions: [],
      });
      // 24h op — but slot spanning 04:59-05:00 crosses two business days
      const start = new Date("2026-05-04T19:45:00.000Z"); // JST 04:45
      const end = new Date("2026-05-04T20:15:00.000Z"); // JST 05:15
      expect(businessHours.containsRange(start, end)).toBe(false);
    });

    it("getEffectiveTimeWindows at post-midnight time returns previous day's windows", () => {
      const businessHours = BusinessHours.create({
        weekly: [
          {
            dayOfWeek: 1, // Monday only
            isClosed: false,
            timeWindows: [{ startTime: "20:00", endTime: "04:00" }],
          },
          ...Array.from({ length: 6 }, (_, i) => ({
            dayOfWeek: i === 0 ? 0 : i + 1, // Sun, Tue-Sat closed
            isClosed: true,
            timeWindows: [],
          })),
        ],
        includePublicHolidays: true,
        exceptions: [],
      });
      // Tue 03:00 JST -> should return Monday's windows
      const windows = businessHours.getEffectiveTimeWindows(
        new Date("2026-05-04T18:00:00.000Z"), // JST Tue 03:00
      );
      expect(windows).toEqual([{ startTime: "20:00", endTime: "04:00" }]);
    });
  });
});
