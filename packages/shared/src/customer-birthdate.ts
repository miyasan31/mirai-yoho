const CLIENT_BIRTHDATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

interface BirthdateParts {
  year: number;
  month: number;
  day: number;
}

function parseBirthdateParts(value: string): BirthdateParts | null {
  const match = CLIENT_BIRTHDATE_REGEX.exec(value);
  if (!match) return null;

  const [, yearRaw, monthRaw, dayRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  return { year, month, day };
}

function toUtcDateValue(parts: BirthdateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

export function isValidCustomerBirthdateFormat(value: string): boolean {
  const parts = parseBirthdateParts(value);
  if (!parts) return false;

  const utcValue = toUtcDateValue(parts);
  const date = new Date(utcValue);

  return (
    date.getUTCFullYear() === parts.year &&
    date.getUTCMonth() === parts.month - 1 &&
    date.getUTCDate() === parts.day
  );
}

export function isFutureCustomerBirthdate(
  value: string,
  now = new Date(),
): boolean {
  const parts = parseBirthdateParts(value);
  if (!parts) return false;
  if (!isValidCustomerBirthdateFormat(value)) return false;

  const birthDateUtc = toUtcDateValue(parts);
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return birthDateUtc > todayUtc;
}
