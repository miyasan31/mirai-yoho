import type { AppConfig, RelationTarget } from "./types.js";

/**
 * 関連性を書ける向き。上流のマニュアルにだけ下流への影響を書く。
 * 予約サイト（user）は最下流なので何も書けない。
 */
const DOWNSTREAM: Record<string, readonly RelationTarget[]> = {
  console: ["consultant", "user"],
  consultant: ["user"],
  user: [],
};

/**
 * 予約サイトのマニュアルに現れてはいけない語。
 * 「運営」「占い師」は予約サイト自身の文言にも出るため対象にしない。
 */
const FORBIDDEN_WORDS: Record<string, readonly string[]> = {
  user: ["コンソール", "管理画面", "運営担当", "オペレーター"],
  // 占い師コンソールは自分自身を指すので対象にしない
  consultant: ["運営コンソール", "運営担当", "オペレーター"],
};

type LabeledText = { path: string; text: string };

function collectTexts(config: AppConfig): LabeledText[] {
  const texts: LabeledText[] = [];
  for (const section of config.sections) {
    texts.push({ path: `sections.${section.id}.title`, text: section.title });
    for (const page of section.pages) {
      const base = `sections.${section.id}.pages.${page.id}`;
      texts.push({ path: `${base}.title`, text: page.title });
      texts.push({ path: `${base}.overview`, text: page.overview });
      for (const annotation of page.annotations) {
        const at = `${base}.annotations[${annotation.n}]`;
        texts.push({ path: `${at}.title`, text: annotation.title });
        texts.push({ path: `${at}.description`, text: annotation.description });
      }
    }
  }
  return texts;
}

function validateRelationDirection(config: AppConfig, errors: string[]): void {
  const allowed = DOWNSTREAM[config.appId];
  if (!allowed) {
    errors.push(
      `appId "${config.appId}" の下流が未定義です。src/validate-config.ts の DOWNSTREAM に追加してください。`,
    );
    return;
  }
  for (const section of config.sections) {
    for (const page of section.pages) {
      for (const relation of page.relations ?? []) {
        if (allowed.includes(relation.target)) continue;
        errors.push(
          `${page.id}: "${relation.target}" は ${config.appId} の下流ではありません（許可: ${allowed.join(", ") || "なし"}）。上流のマニュアル側に書いてください。`,
        );
      }
    }
  }
  if (allowed.length === 0 && config.serviceMap) {
    errors.push(
      `${config.appId} は最下流なので serviceMap を定義できません。他サービスへの言及を削除してください。`,
    );
  }
}

function validateForbiddenWords(config: AppConfig, errors: string[]): void {
  const words = FORBIDDEN_WORDS[config.appId];
  if (!words) return;
  for (const { path, text } of collectTexts(config)) {
    for (const word of words) {
      if (!text.includes(word)) continue;
      errors.push(
        `${path}: "${word}" は ${config.appId} の文言に使えません（${text}）`,
      );
    }
  }
}

/** config が方向ルールに違反していれば例外で停止する */
export function validateAppConfig(config: AppConfig): void {
  const errors: string[] = [];
  validateRelationDirection(config, errors);
  validateForbiddenWords(config, errors);
  if (errors.length === 0) return;
  throw new Error(
    `${config.appId} の config が方向ルールに違反しています:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
  );
}
