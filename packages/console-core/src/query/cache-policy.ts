const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const cachePolicy = {
  realtime: { staleTime: 0, gcTime: 1 * MINUTE },
  short: { staleTime: 30 * SECOND, gcTime: 5 * MINUTE },
  normal: { staleTime: 5 * MINUTE, gcTime: 30 * MINUTE },
  long: { staleTime: 30 * MINUTE, gcTime: 2 * HOUR },
} as const;

export type CachePolicyName = keyof typeof cachePolicy;
