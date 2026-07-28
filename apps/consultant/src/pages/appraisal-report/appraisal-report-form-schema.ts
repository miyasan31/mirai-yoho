import * as v from "valibot";

const TITLE_MAX_LENGTH = 120;
const NAME_MAX_LENGTH = 120;
const SECTION_MAX_LENGTH = 10_000;

const section = (label: string) =>
  v.pipe(
    v.string(),
    v.maxLength(
      SECTION_MAX_LENGTH,
      `${label}は${SECTION_MAX_LENGTH.toLocaleString("ja-JP")}文字以内で入力してください`,
    ),
  );

export const appraisalReportFormSchema = v.object({
  title: v.pipe(
    v.string(),
    v.maxLength(
      TITLE_MAX_LENGTH,
      `タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください`,
    ),
  ),
  customerName: v.pipe(
    v.string(),
    v.maxLength(
      NAME_MAX_LENGTH,
      `お名前は${NAME_MAX_LENGTH}文字以内で入力してください`,
    ),
  ),
  birthDate: v.string(),
  appraisalDate: v.string(),
  theme: section("鑑定テーマ"),
  currentSituation: section("現状"),
  result: section("鑑定結果"),
  luckyAction: section("開運アクション"),
  summary: section("総括"),
});

export type AppraisalReportFormValues = v.InferOutput<
  typeof appraisalReportFormSchema
>;

export const APPRAISAL_REPORT_EMPTY_VALUES: AppraisalReportFormValues = {
  title: "",
  customerName: "",
  birthDate: "",
  appraisalDate: "",
  theme: "",
  currentSituation: "",
  result: "",
  luckyAction: "",
  summary: "",
};

export const APPRAISAL_REPORT_SECTIONS = [
  {
    name: "theme",
    label: "鑑定テーマ",
    helper: "今回の鑑定で扱ったテーマ",
    rows: 3,
  },
  {
    name: "currentSituation",
    label: "現状",
    helper: "鑑定時点での状況の読み解き",
    rows: 6,
  },
  {
    name: "result",
    label: "鑑定結果",
    helper: "鑑定の結果。発行するには入力が必要です",
    rows: 10,
  },
  {
    name: "luckyAction",
    label: "開運アクション",
    helper: "今日から実践できる具体的なアクション",
    rows: 6,
  },
  { name: "summary", label: "総括", helper: "全体のまとめ", rows: 4 },
] as const satisfies ReadonlyArray<{
  name: keyof AppraisalReportFormValues;
  label: string;
  helper: string;
  rows: number;
}>;
