export type Annotation = {
  n: number;
  selector?: string;
  title: string;
  description: string;
};

/** 関連性を書ける影響先。上流から下流への一方向のみ */
export type RelationTarget = "consultant" | "user";

/**
 * その画面での操作が下流サービスに与える影響。
 * 書ける向きは console → consultant / console → user / consultant → user のみで、
 * validate-config.ts が実行時に強制する。
 */
export type Relation = {
  target: RelationTarget;
  /** 影響先アプリでの画面名（例: 「料金プラン」「開始時刻選択」） */
  screen: string;
  /** 1 文。何がどう変わるかを結果で書く */
  effect: string;
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
  relations?: readonly Relation[];
  /** スクショ前の操作。モーダルを開くなど。省略時は goto のみ */
  setup?: (context: import("./context.js").CaptureContext) => Promise<void>;
  /** モーダルなど画面に重なる要素は "viewport"。既定は "full" */
  captureMode?: "full" | "viewport";
};

export type SectionDef = {
  id: string;
  title: string;
  pages: PageDef[];
};

/** 冒頭に置く「サービス連携の全体像」。予約サイトでは未定義にする */
export type ServiceMap = {
  summary: string;
  flows: readonly { path: string; items: readonly string[] }[];
};

export type EnvConfig = {
  baseUrl: string;
  defaultOrgId?: string;
};

export type AppConfig = {
  appId: string;
  appName: string;
  audience: string;
  environments: Record<string, EnvConfig>;
  defaultEnv: string;
  loginPath: string;
  postLoginUrlPattern: RegExp;
  extractOrganizationId?: (url: string) => string | null;
  resolveDynamicParams?: (
    context: import("./context.js").CaptureContext,
  ) => Promise<Record<string, string | undefined>>;
  serviceMap?: ServiceMap;
  sections: SectionDef[];
};

export type ResolvedApp = {
  config: AppConfig;
  env: string;
  baseUrl: string;
  defaultOrgId: string | undefined;
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
  /** 旧 capture.json との互換のため optional */
  relations?: Relation[];
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
  env: string;
  baseUrl: string;
  capturedAt: string;
  serviceMap?: ServiceMap;
  sections: CapturedSection[];
};
