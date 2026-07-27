import type { Page } from "playwright";

export type CaptureContext = {
  page: Page;
  baseUrl: string;
  params: Record<string, string | undefined>;
};
