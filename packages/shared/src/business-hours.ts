import { DomainError } from "./domain-error";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MINUTES_PER_DAY = 24 * 60;
const BUSINESS_DAY_START_HOUR = 5;
const BUSINESS_DAY_START_MINUTES = BUSINESS_DAY_START_HOUR * 60;

export interface BusinessTimeWindow {
  startTime: string;
  endTime: string;
}

export interface WeeklyBusinessHours {
  dayOfWeek: number;
  isClosed: boolean;
  timeWindows: BusinessTimeWindow[];
}

export interface BusinessHoursException {
  startDate: string;
  endDate: string;
  isClosed: boolean;
  timeWindows: BusinessTimeWindow[];
}

export interface BusinessHoursProps {
  weekly: WeeklyBusinessHours[];
  includePublicHolidays: boolean;
  exceptions: BusinessHoursException[];
}

function cloneTimeWindow(window: BusinessTimeWindow): BusinessTimeWindow {
  return { startTime: window.startTime, endTime: window.endTime };
}

function cloneWeekly(item: WeeklyBusinessHours): WeeklyBusinessHours {
  return {
    dayOfWeek: item.dayOfWeek,
    isClosed: item.isClosed,
    timeWindows: item.timeWindows.map(cloneTimeWindow),
  };
}

function cloneException(item: BusinessHoursException): BusinessHoursException {
  return {
    startDate: item.startDate,
    endDate: item.endDate,
    isClosed: item.isClosed,
    timeWindows: item.timeWindows.map(cloneTimeWindow),
  };
}

function parseTimeToMinutes(value: string): number {
  const matched = /^([01]\d|2[0-3]):([03]0)$/.exec(value);
  if (!matched) {
    throw new DomainError(
      "INVALID_BUSINESS_HOURS",
      `Invalid time format: ${value}`,
    );
  }
  return Number(matched[1]) * 60 + Number(matched[2]);
}

function toBusinessDayMinutes(clockMinutes: number): number {
  return (
    (clockMinutes - BUSINESS_DAY_START_MINUTES + MINUTES_PER_DAY) %
    MINUTES_PER_DAY
  );
}

function is24HourWindow(startMinutes: number, endMinutes: number): boolean {
  return startMinutes === endMinutes;
}

interface BdmMinuteWindow {
  startMinutes: number;
  endMinutes: number;
  startBdm: number;
  endBdm: number;
  is24h: boolean;
}

function formatMinutesAsHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function validateAndNormalizeTimeWindows(
  windows: BusinessTimeWindow[],
): BusinessTimeWindow[] {
  if (!Array.isArray(windows)) {
    throw new DomainError(
      "INVALID_BUSINESS_HOURS",
      "timeWindows must be array",
    );
  }

  const bdmWindows: BdmMinuteWindow[] = windows.map((window) => {
    const startMinutes = parseTimeToMinutes(window.startTime);
    const endMinutes = parseTimeToMinutes(window.endTime);
    const is24h = is24HourWindow(startMinutes, endMinutes);
    const startBdm = toBusinessDayMinutes(startMinutes);
    const endBdm = is24h ? MINUTES_PER_DAY : toBusinessDayMinutes(endMinutes);
    if (!is24h && startBdm >= endBdm) {
      throw new DomainError(
        "INVALID_BUSINESS_HOURS",
        "Business time window must be within a single business day (5:00 start)",
      );
    }
    return { startMinutes, endMinutes, startBdm, endBdm, is24h };
  });

  if (bdmWindows.some((window) => window.is24h) && bdmWindows.length > 1) {
    throw new DomainError(
      "INVALID_BUSINESS_HOURS",
      "24-hour window cannot coexist with other windows",
    );
  }

  bdmWindows.sort((a, b) => a.startBdm - b.startBdm);

  for (let index = 1; index < bdmWindows.length; index += 1) {
    if (bdmWindows[index - 1].endBdm > bdmWindows[index].startBdm) {
      throw new DomainError(
        "INVALID_BUSINESS_HOURS",
        "Business time windows must not overlap",
      );
    }
  }

  return bdmWindows.map((window) => ({
    startTime: formatMinutesAsHHMM(window.startMinutes),
    endTime: formatMinutesAsHHMM(window.endMinutes),
  }));
}

function parseDateString(value: string): {
  year: number;
  month: number;
  day: number;
} {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!matched) {
    throw new DomainError(
      "INVALID_BUSINESS_HOURS",
      `Invalid date format: ${value}`,
    );
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new DomainError("INVALID_BUSINESS_HOURS", `Invalid date: ${value}`);
  }
  return { year, month, day };
}

function dateToComparableNumber(value: string): number {
  const parsed = parseDateString(value);
  return parsed.year * 10000 + parsed.month * 100 + parsed.day;
}

function getNthMonday(year: number, month: number, nth: number): number {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const firstDayWeekday = firstDay.getUTCDay();
  const firstMonday =
    firstDayWeekday === 1 ? 1 : 1 + ((8 - firstDayWeekday) % 7);
  return firstMonday + (nth - 1) * 7;
}

function getVernalEquinoxDay(year: number): number {
  return Math.floor(
    20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4),
  );
}

function getAutumnEquinoxDay(year: number): number {
  return Math.floor(
    23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4),
  );
}

function formatYmd(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildJapanesePublicHolidaySet(year: number): Set<string> {
  const holidays = new Set<string>();
  const add = (month: number, day: number) => {
    holidays.add(formatYmd(year, month, day));
  };

  add(1, 1);
  add(1, getNthMonday(year, 1, 2));
  add(2, 11);
  if (year >= 2020) {
    add(2, 23);
  }
  add(3, getVernalEquinoxDay(year));
  add(4, 29);
  add(5, 3);
  add(5, 4);
  add(5, 5);
  add(7, getNthMonday(year, 7, 3));
  if (year >= 2016) {
    add(8, 11);
  }
  add(9, getNthMonday(year, 9, 3));
  add(9, getAutumnEquinoxDay(year));
  add(10, getNthMonday(year, 10, 2));
  add(11, 3);
  add(11, 23);

  const fixedHolidays = [...holidays];
  for (const holiday of fixedHolidays) {
    const parsed = parseDateString(holiday);
    const utcDate = new Date(
      Date.UTC(parsed.year, parsed.month - 1, parsed.day),
    );
    if (utcDate.getUTCDay() !== 0) {
      continue;
    }

    let substitute = new Date(
      Date.UTC(parsed.year, parsed.month - 1, parsed.day + 1),
    );
    while (
      holidays.has(
        formatYmd(
          substitute.getUTCFullYear(),
          substitute.getUTCMonth() + 1,
          substitute.getUTCDate(),
        ),
      )
    ) {
      substitute = new Date(
        Date.UTC(
          substitute.getUTCFullYear(),
          substitute.getUTCMonth(),
          substitute.getUTCDate() + 1,
        ),
      );
    }
    add(substitute.getUTCMonth() + 1, substitute.getUTCDate());
  }

  for (let month = 1; month <= 12; month += 1) {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let day = 2; day < daysInMonth; day += 1) {
      const prev = formatYmd(year, month, day - 1);
      const current = formatYmd(year, month, day);
      const next = formatYmd(year, month, day + 1);
      const currentDate = new Date(Date.UTC(year, month - 1, day));
      if (
        !holidays.has(current) &&
        currentDate.getUTCDay() !== 0 &&
        holidays.has(prev) &&
        holidays.has(next)
      ) {
        holidays.add(current);
      }
    }
  }

  return holidays;
}

function getJstBusinessDayParts(date: Date): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
} {
  const shifted = new Date(
    date.getTime() + JST_OFFSET_MS - BUSINESS_DAY_START_MINUTES * 60 * 1000,
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay(),
  };
}

function buildDateFromJst(
  year: number,
  month: number,
  day: number,
  minutes: number,
): Date {
  const utcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - JST_OFFSET_MS;
  return new Date(utcMs + minutes * 60 * 1000);
}

function isDateInException(
  targetYmd: string,
  businessHoursException: BusinessHoursException,
): boolean {
  const target = dateToComparableNumber(targetYmd);
  return (
    target >= dateToComparableNumber(businessHoursException.startDate) &&
    target <= dateToComparableNumber(businessHoursException.endDate)
  );
}

function normalizeWeekly(
  rawWeekly: WeeklyBusinessHours[],
): WeeklyBusinessHours[] {
  if (!Array.isArray(rawWeekly)) {
    throw new DomainError("INVALID_BUSINESS_HOURS", "weekly must be array");
  }

  const weeklyMap = new Map<number, WeeklyBusinessHours>();
  for (const item of rawWeekly) {
    if (
      !Number.isInteger(item.dayOfWeek) ||
      item.dayOfWeek < 0 ||
      item.dayOfWeek > 6
    ) {
      throw new DomainError(
        "INVALID_BUSINESS_HOURS",
        "dayOfWeek must be integer from 0 to 6",
      );
    }
    if (weeklyMap.has(item.dayOfWeek)) {
      throw new DomainError(
        "INVALID_BUSINESS_HOURS",
        `dayOfWeek duplicated: ${item.dayOfWeek}`,
      );
    }

    const isClosed = Boolean(item.isClosed);
    const normalizedWindows = isClosed
      ? []
      : validateAndNormalizeTimeWindows(item.timeWindows);

    if (!isClosed && normalizedWindows.length === 0) {
      throw new DomainError(
        "INVALID_BUSINESS_HOURS",
        `timeWindows are required for open dayOfWeek ${item.dayOfWeek}`,
      );
    }

    weeklyMap.set(item.dayOfWeek, {
      dayOfWeek: item.dayOfWeek,
      isClosed,
      timeWindows: normalizedWindows,
    });
  }

  const normalizedWeekly: WeeklyBusinessHours[] = [];
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    normalizedWeekly.push(
      weeklyMap.get(dayOfWeek) ?? {
        dayOfWeek,
        isClosed: true,
        timeWindows: [],
      },
    );
  }
  return normalizedWeekly;
}

function normalizeExceptions(
  rawExceptions: BusinessHoursException[],
): BusinessHoursException[] {
  if (!Array.isArray(rawExceptions)) {
    throw new DomainError("INVALID_BUSINESS_HOURS", "exceptions must be array");
  }

  const normalized = rawExceptions.map((businessHoursException) => {
    const startComparable = dateToComparableNumber(
      businessHoursException.startDate,
    );
    const endComparable = dateToComparableNumber(
      businessHoursException.endDate,
    );
    if (startComparable > endComparable) {
      throw new DomainError(
        "INVALID_BUSINESS_HOURS",
        "exception startDate must be on or before endDate",
      );
    }

    const isClosed = Boolean(businessHoursException.isClosed);
    const normalizedWindows = isClosed
      ? []
      : validateAndNormalizeTimeWindows(businessHoursException.timeWindows);

    if (!isClosed && normalizedWindows.length === 0) {
      throw new DomainError(
        "INVALID_BUSINESS_HOURS",
        "timeWindows are required for open exception",
      );
    }

    return {
      startDate: businessHoursException.startDate,
      endDate: businessHoursException.endDate,
      isClosed,
      timeWindows: normalizedWindows,
    };
  });

  normalized.sort(
    (left, right) =>
      dateToComparableNumber(left.startDate) -
      dateToComparableNumber(right.startDate),
  );
  return normalized;
}

export class BusinessHours {
  private constructor(private readonly props: BusinessHoursProps) {}

  static createDefault(): BusinessHours {
    const weekly: WeeklyBusinessHours[] = [];
    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
      weekly.push({
        dayOfWeek,
        isClosed: false,
        timeWindows: [{ startTime: "10:00", endTime: "17:00" }],
      });
    }
    return BusinessHours.create({
      weekly,
      includePublicHolidays: true,
      exceptions: [],
    });
  }

  static create(props: BusinessHoursProps): BusinessHours {
    const normalizedWeekly = normalizeWeekly(props.weekly);
    const normalizedExceptions = normalizeExceptions(props.exceptions);
    return new BusinessHours({
      weekly: normalizedWeekly,
      includePublicHolidays: Boolean(props.includePublicHolidays),
      exceptions: normalizedExceptions,
    });
  }

  static reconstruct(props: BusinessHoursProps): BusinessHours {
    return BusinessHours.create(props);
  }

  getIncludePublicHolidays(): boolean {
    return this.props.includePublicHolidays;
  }

  getWeekly(): WeeklyBusinessHours[] {
    return this.props.weekly.map(cloneWeekly);
  }

  getExceptions(): BusinessHoursException[] {
    return this.props.exceptions.map(cloneException);
  }

  toJSON(): BusinessHoursProps {
    return {
      weekly: this.getWeekly(),
      includePublicHolidays: this.getIncludePublicHolidays(),
      exceptions: this.getExceptions(),
    };
  }

  getEffectiveTimeWindows(date: Date): BusinessTimeWindow[] {
    const businessDay = getJstBusinessDayParts(date);
    const ymd = formatYmd(businessDay.year, businessDay.month, businessDay.day);

    const matchedException = this.props.exceptions.find(
      (businessHoursException) =>
        isDateInException(ymd, businessHoursException),
    );
    if (matchedException) {
      return matchedException.isClosed
        ? []
        : matchedException.timeWindows.map(cloneTimeWindow);
    }

    const holidaySet = buildJapanesePublicHolidaySet(businessDay.year);
    if (!this.props.includePublicHolidays && holidaySet.has(ymd)) {
      return [];
    }

    const weekly = this.props.weekly.find(
      (item) => item.dayOfWeek === businessDay.dayOfWeek,
    );
    if (!weekly || weekly.isClosed) {
      return [];
    }
    return weekly.timeWindows.map(cloneTimeWindow);
  }

  getEffectiveTimeRanges(date: Date): Array<{ startsAt: Date; endsAt: Date }> {
    const businessDay = getJstBusinessDayParts(date);
    const windows = this.getEffectiveTimeWindows(date);
    return windows.map((window) => {
      const startMinutes = parseTimeToMinutes(window.startTime);
      const endMinutes = parseTimeToMinutes(window.endTime);
      const is24h = is24HourWindow(startMinutes, endMinutes);
      const startBdm = toBusinessDayMinutes(startMinutes);
      const endBdm = is24h ? MINUTES_PER_DAY : toBusinessDayMinutes(endMinutes);
      return {
        startsAt: buildDateFromJst(
          businessDay.year,
          businessDay.month,
          businessDay.day,
          BUSINESS_DAY_START_MINUTES + startBdm,
        ),
        endsAt: buildDateFromJst(
          businessDay.year,
          businessDay.month,
          businessDay.day,
          BUSINESS_DAY_START_MINUTES + endBdm,
        ),
      };
    });
  }

  containsRange(startsAt: Date, endsAt: Date): boolean {
    if (endsAt <= startsAt) return false;
    const startParts = getJstBusinessDayParts(startsAt);
    const endParts = getJstBusinessDayParts(new Date(endsAt.getTime() - 1));
    if (
      startParts.year !== endParts.year ||
      startParts.month !== endParts.month ||
      startParts.day !== endParts.day
    ) {
      return false;
    }

    const windows = this.getEffectiveTimeRanges(startsAt);
    return windows.some(
      (window) => startsAt >= window.startsAt && endsAt <= window.endsAt,
    );
  }

  getCalendarBounds(): {
    minHour: number;
    minMinute: number;
    maxHour: number;
    maxMinute: number;
  } {
    const bdmWindows: Array<{ startBdm: number; endBdm: number }> = [];
    for (const weekly of this.props.weekly) {
      if (weekly.isClosed) continue;
      for (const window of weekly.timeWindows) {
        const startMinutes = parseTimeToMinutes(window.startTime);
        const endMinutes = parseTimeToMinutes(window.endTime);
        const is24h = is24HourWindow(startMinutes, endMinutes);
        bdmWindows.push({
          startBdm: toBusinessDayMinutes(startMinutes),
          endBdm: is24h ? MINUTES_PER_DAY : toBusinessDayMinutes(endMinutes),
        });
      }
    }

    if (bdmWindows.length === 0) {
      return { minHour: 10, minMinute: 0, maxHour: 17, maxMinute: 0 };
    }

    const minStart =
      BUSINESS_DAY_START_MINUTES +
      Math.min(...bdmWindows.map((window) => window.startBdm));
    const maxEnd =
      BUSINESS_DAY_START_MINUTES +
      Math.max(...bdmWindows.map((window) => window.endBdm));

    return {
      minHour: Math.floor(minStart / 60),
      minMinute: minStart % 60,
      maxHour: Math.floor(maxEnd / 60),
      maxMinute: maxEnd % 60,
    };
  }
}
