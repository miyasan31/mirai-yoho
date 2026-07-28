---
name: create-manual
description: Playwright で SPA を巡回してスクショ + 注釈 + 説明つきの PDF 操作マニュアルを生成する。consultant / console / user、local / dev / prod など任意の環境に対応
user_invocable: true
args: "<app_id> [env]"
---

# 操作マニュアル PDF の生成

`scripts/manual/` のツールを使って、対象 SPA（consultant / console / user）を Playwright で巡回し、スクリーンショット + 番号付き注釈 + 説明文を組み込んだ PDF マニュアルを生成します。出力先は環境に応じて:

- local: `doc/manual/<app_id>-manual.pdf`
- 他: `doc/manual/<app_id>-manual-<env>.pdf`

## 引数

- `app_id`: 対象アプリ ID（`consultant` / `console` / `user`）。`scripts/manual/apps/<app_id>.ts` が存在するか、これから作成する
- `env`（省略可）: 環境名（`local` / `dev` / `prod`）。省略時は config の `defaultEnv`

## いつ使うか

- 「占い師管理画面のマニュアル作って」「consultant のマニュアルを更新して」など、SPA の操作マニュアルを PDF で欲しいと言われたとき
- 既存アプリ config の注釈・文言を更新したいとき
- 新しいアプリのマニュアルを追加したいとき
- 「dev 環境で撮って欲しい」など環境を指定されたとき

## 全体フロー

1. local なら対象 SPA を dev で起動（例: `pnpm dev:consultant`）。dev / prod なら不要
2. `apps/<app_id>.ts` が存在するか確認 → なければ新規作成（下記「新アプリ追加」参照）
3. `pnpm --filter manual login <app_id> [env]` で手動ログイン（env ごとに初回のみ）
4. `pnpm --filter manual build <app_id> [env]` でキャプチャ → PDF 生成
5. 生成された PDF を確認し、注釈のズレや誤字を修正 → 再生成
6. 必要に応じて `apps/<app_id>.ts` をコミット（PDF 本体はコミットしない場合が多い）

## 環境と組織 ID の指定

各 app config の `environments` に `local` / `dev` / `prod` を定義しておく:

```ts
environments: {
  local: { baseUrl: "http://localhost:3030" },
  dev: {
    baseUrl: "https://dev.consultant.miraiyohou.com",
    defaultOrgId: process.env.CONSULTANT_DEV_ORG_ID,
  },
  prod: {
    baseUrl: "https://consultant.miraiyohou.com",
    defaultOrgId: process.env.CONSULTANT_PROD_ORG_ID,
  },
},
defaultEnv: "local",
```

組織 ID の優先順位:

1. `MANUAL_ORG_ID` 環境変数（最優先）
2. `state.json`（ログイン時に URL から自動抽出）
3. `environments[env].defaultOrgId`

つまり、恒常的な dev 組織を狙うなら `.env.dev` 相当の shell 変数で `CONSULTANT_DEV_ORG_ID` を持たせ、一回きりの切替なら `MANUAL_ORG_ID=... build ...` で上書きできる。

## 一貫性ルール（必ず遵守）

デザインは `scripts/manual/src/template.ts` に集約している。**ここは触らない**。文言・構造レベルで一貫性を保つには、以下のルールに従って `apps/<app_id>.ts` を書く。

### タイトル / 呼び名

- `appName`: 「みらい予報 <役割>コンソール」の形（例: 「みらい予報 占い師コンソール」「みらい予報 運営コンソール」「みらい予報 予約サイト」）
- `audience`: 対象読者を短く（例: 「占い師」「運営担当者」「予約者」）
- 表紙は自動で「<appName> 操作マニュアル」となる

### セクション設計

管理系アプリ（consultant / console）は 3 セクション構成を基本とする:

1. **サインイン** … ログイン / パスワード再設定など認証まわり
2. **日々の運用** … ホーム / 一覧 / 個別編集など、毎日触る画面
3. **設定・管理** … 頻度の低い設定変更（プロフィール、料金、権限等）

エンドユーザー向け（user）は毎日触る画面という概念がないため、利用者の導線順に並べる:

1. **はじめに** … トップ / 会員登録
2. **予約する** … 占い師選択から予約完了・キャンセルまで
3. **マイページ** … プロフィール / 予約一覧 / Zoom 連携 / クーポン
4. **規約・退会** … 規約類と退会

### ページ定義

各 `PageDef` は以下を必ず含める:

- `id`: kebab-case で画面を識別（URL の末尾セグメント等）
- `title`: 日本語の画面名（例: 「予約一覧」「鑑定メモ編集」）。冠詞や「〜画面」は付けない
- `overview`: **1〜2 文の日本語**。「この画面で何ができるか」を端的に。ですます調で統一
- `route`: `/{orgId}/bookings` のように placeholder は `{}` で囲む
- `requiresAuth`: 認証必須ページは true
- `requires`: 動的パラメタが必要なら列挙（例: `["orgId", "bookingId"]`）。存在しなければ自動スキップ
- `waitForSelector`: レンダリング完了検知用（`h1` / `form` / 特定クラス等）

### 注釈（annotations）

**主要操作 3〜5 個** に絞ること。網羅は避け、その画面を初めて触るユーザーが最初に理解すべき要素を選ぶ。

各注釈:

- `n`: 1 始まりの連番
- `selector`: CSS セレクタまたは `text=...`（Playwright のテキストマッチ）。**壊れやすいセレクタは避ける**（ランダム ID や nth-child は使わない）。優先度: セマンティック属性 > テキスト > タグ + 属性
- `title`: UI 要素の名前（例: 「次の予約カード」「保存ボタン」）。冠詞なし、体言止め
- `description`: **1 文の日本語**。ですます調で「〜します」で終える。何がどうなるかを書く。UI の見た目は書かない

セレクタが見つからなくても注釈自体は掲載される（テンプレートが番号を灰色で表示する）。

### 文言スタイル

- ですます調に統一
- 「クリック」ではなく「タップ」でもなく **操作の結果** を書く（❌「ボタンをクリック」 ✅「変更を保存します」）
- 敬語は最小限（❌「〜してください」を多用しない、✅ 動詞の連用中止で流す）
- 全角スペースは使わない
- 半角英数字と日本語の間はスペースを空けない（既存ドキュメントに合わせる）

## 新アプリ追加

`apps/<app_id>.ts` を作成し、`AppConfig` を default export する。既存の `apps/consultant.ts` を雛形にすること。

### 必須項目

- `appId`: `<app_id>` と一致
- `appName` / `audience`: 上記命名規則に従う
- `environments`: `local` / `dev` / `prod` を定義。各 `{ baseUrl, defaultOrgId? }`。local の baseUrl は環境変数で上書き可能に（例: `process.env.CONSOLE_BASE_URL ?? "http://localhost:3010"`）
- `defaultEnv`: 省略時に使う環境名（通常 `local`）
- `loginPath`: ログイン画面のパス
- `postLoginUrlPattern`: ログイン成功後に遷移する URL を検知する正規表現
- `extractOrganizationId`: URL から orgId を取り出す関数（不要なら省略可）
- `resolveDynamicParams`: `{bookingId}` のような追加 placeholder を実行時に解決する関数（不要なら省略可）
- `sections`: 上記セクション設計に従う配列

### 対象 SPA のルート一覧を調べる

各 SPA のルートは `apps/<app>/src/routes/` を読む。TanStack Router の file-based routing 規約なので、`.tsx` ファイル 1 つが 1 画面に対応する。動的セグメントは `$id.tsx` のように `$` で始まる。

### 注釈のためのセレクタ調査

各画面のソース（`apps/<app>/src/pages/<page>/page.tsx` または `apps/<app>/src/routes/**/*.tsx`）を読み、目立つ UI 要素のクラス・ロール・テキストを確認する。Park UI の `Button` は `<button>` に展開されるので `button[type="submit"]` などが安定。テキストマッチ `text=見出し` も有効。

## user（予約サイト）固有の前提

`user` は認証と組織 ID の扱いが管理系アプリと異なる。詳細は `scripts/manual/README.md` の「user 固有の注意」を参照。要点:

- 専用ログイン画面がないため `loginPath` は `/register`、ログイン完了は `/mypage` への遷移で検知する
- ログイン後の URL に組織 ID が含まれないので `MANUAL_ORG_ID` / `USER_*_ORG_ID` の指定が必須
- 予約フォームは会員情報登録と Zoom 連携が済んだアカウントでしか表示されない。プロフィールの氏名・メール・電話番号が予約フォームに初期表示され PDF に写るため、撮影用アカウントにはダミー値を登録する
- お支払い画面の撮影には実在の予約が必要なため、`capture` が予約を 1 件作成する（Zoom 生成とメール送信を伴う）。local / dev は既定で作成、prod は `MANUAL_CREATE_BOOKING=1` を明示したときのみ。作成した予約は撮影後に片付ける
- Google ログインが Playwright 同梱 Chromium で弾かれる場合は `MANUAL_BROWSER_CHANNEL=chrome` を `login` と `capture` の両方に指定する

## 実行例

```bash
# local
pnpm dev:consultant
pnpm --filter manual login consultant
pnpm --filter manual build consultant
# → doc/manual/consultant-manual.pdf

# dev
pnpm --filter manual login consultant dev
pnpm --filter manual build consultant dev
# → doc/manual/consultant-manual-dev.pdf

# orgId を一時的に上書き
MANUAL_ORG_ID=abc123 pnpm --filter manual build consultant dev

# user（orgId 必須。Google ログインが弾かれる場合は channel を指定）
pnpm dev:user
MANUAL_ORG_ID=abc123 pnpm --filter manual login user
MANUAL_ORG_ID=abc123 pnpm --filter manual build user
# → doc/manual/user-manual.pdf
```

## トラブルシューティング

- **注釈の番号が UI とズレる**: `apps/<app_id>.ts` のセレクタが変更後の DOM と一致していない。ソースを再読して選び直す
- **画面が空 / ローディングのまま撮影される**: `waitForSelector` を確実に描画される要素に変える
- **予約 ID など動的 param が取れない**: 対象 SPA にサンプルデータ（予約 1 件以上）が入っているか確認、または `MANUAL_ORG_ID` / config の `defaultOrgId` を設定
- **ログインセッションが切れた**: `.work/<app_id>/<env>/profile/` を削除し `login` からやり直す

## やってはいけないこと

- `scripts/manual/src/template.ts` を app 個別の都合で変更しない（一貫性が壊れる）。デザイン方針を変えたい場合は必ずユーザーに確認
- 注釈を 6 個以上にしない（PDF が縦に伸びて読みにくくなる）
- スクショに個人情報が写る場合は事前にテストデータへ差し替える
- `.work/` の中身をコミットしない（`.gitignore` 済み）
