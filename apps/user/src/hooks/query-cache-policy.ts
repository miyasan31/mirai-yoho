const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const QUERY_STALE_TIME = {
  short: 30 * SECOND,
  normal: 5 * MINUTE,
} as const;
