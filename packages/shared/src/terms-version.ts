export const CURRENT_TERMS_VERSION = "2026-08-01";

export function isSupportedTermsVersion(value: string): boolean {
  return value === CURRENT_TERMS_VERSION;
}
