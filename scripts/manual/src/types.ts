export type Annotation = {
  n: number;
  selector?: string;
  title: string;
  description: string;
};

export type PageDef = {
  id: string;
  title: string;
  overview: string;
  route: string;
  requiresAuth?: boolean;
  requires?: readonly string[];
  waitForSelector?: string;
  annotations: Annotation[];
};

export type SectionDef = {
  id: string;
  title: string;
  pages: PageDef[];
};

export type AppConfig = {
  appId: string;
  appName: string;
  audience: string;
  baseUrl: string;
  loginPath: string;
  postLoginUrlPattern: RegExp;
  extractOrganizationId?: (url: string) => string | null;
  resolveDynamicParams?: (
    context: import("./context.js").CaptureContext,
  ) => Promise<Record<string, string | undefined>>;
  sections: SectionDef[];
};

export type CapturedAnnotation = Annotation & {
  box: { x: number; y: number; width: number; height: number } | null;
};

export type CapturedPage = {
  id: string;
  title: string;
  overview: string;
  url: string;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  annotations: CapturedAnnotation[];
};

export type CapturedSection = {
  id: string;
  title: string;
  pages: CapturedPage[];
};

export type CaptureResult = {
  appId: string;
  appName: string;
  audience: string;
  capturedAt: string;
  sections: CapturedSection[];
};
