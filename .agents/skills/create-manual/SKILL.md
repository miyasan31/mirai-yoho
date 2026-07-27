---
name: create-manual
description: Playwright で SPA を巡回してスクショ + 注釈 + 説明つきの PDF 操作マニュアルを生成する。consultant / console / user など任意の SPA に対応
user_invocable: true
args: "<app_id>"
---

# 操作マニュアル PDF の生成

`scripts/manual/` のツールを使って、対象 SPA（consultant / console / user）を Playwright で巡回し、スクリーンショット + 番号付き注釈 + 説明文を組み込んだ PDF マニュアルを `doc/manual/<app_id>-manual.pdf` に生成します。

## 引数

- `app_id`: 対象アプリ ID（`consultant` / `console` / `user`）。`scripts/manual/apps/<app_id>.ts` が存在するか、これから作成する

## いつ使うか

- 「占い師管理画面のマニュアル作って」「consultant のマニュアルを更新して」など、SPA の操作マニュアルを PDF で欲しいと言われたとき
- 既存アプリ config の注釈・文言を更新したいとき
- 新しいアプリのマニュアルを追加したいとき

## 全体フロー

1. 対象 SPA を dev で起動（例: `pnpm dev:consultant`）
2. `apps/<app_id>.ts` が存在するか確認 → なければ新規作成（下記「新アプリ追加」参照）
3. `pnpm --filter manual login <app_id>` で手動ログイン（初回のみ）
4. `pnpm --filter manual build <app_id>` でキャプチャ → PDF 生成
5. 生成された PDF を確認し、注釈のズレや誤字を修正 → 再生成
6. 必要に応じて `apps/<app_id>.ts` をコミット（PDF 本体はコミットしない場合が多い）

## 一貫性ルール（必ず遵守）

デザインは `scripts/manual/src/template.ts` に集約している。**ここは触らない**。文言・構造レベルで一貫性を保つには、以下のルールに従って `apps/<app_id>.ts` を書く。

### タイトル / 呼び名

- `appName`: 「みらい予報 <役割>コンソール」の形（例: 「みらい予報 占い師コンソール」「みらい予報 運営コンソール」「みらい予報 予約サイト」）
- `audience`: 対象読者を短く（例: 「占い師」「運営担当者」「予約者」）
- 表紙は自動で「<appName> 操作マニュアル」となる

### セクション設計

3 セクション構成を基本とする（画面が少ないアプリはこの限りでない）:

1. **サインイン** … ログイン / パスワード再設定など認証まわり
2. **日々の運用** … ホーム / 一覧 / 個別編集など、毎日触る画面
3. **設定・管理** … 頻度の低い設定変更（プロフィール、料金、権限等）

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
- `baseUrl`: 環境変数で上書き可能に（例: `process.env.CONSOLE_BASE_URL ?? "http://localhost:3010"`）
- `loginPath`: ログイン画面のパス
- `postLoginUrlPattern`: ログイン成功後に遷移する URL を検知する正規表現
- `extractOrganizationId`: URL から orgId を取り出す関数（不要なら省略可）
- `resolveDynamicParams`: `{bookingId}` のような追加 placeholder を実行時に解決する関数（不要なら省略可）
- `sections`: 上記セクション設計に従う配列

### 対象 SPA のルート一覧を調べる

各 SPA のルートは `apps/<app>/src/routes/` を読む。TanStack Router の file-based routing 規約なので、`.tsx` ファイル 1 つが 1 画面に対応する。動的セグメントは `$id.tsx` のように `$` で始まる。

### 注釈のためのセレクタ調査

各画面のソース（`apps/<app>/src/pages/<page>/page.tsx` または `apps/<app>/src/routes/**/*.tsx`）を読み、目立つ UI 要素のクラス・ロール・テキストを確認する。Park UI の `Button` は `<button>` に展開されるので `button[type="submit"]` などが安定。テキストマッチ `text=見出し` も有効。

## 実行例

```bash
# 1. 対象 SPA を起動
pnpm dev:consultant

# 2. 手動ログイン（初回のみ）
pnpm --filter manual login consultant

# 3. 生成
pnpm --filter manual build consultant
# → doc/manual/consultant-manual.pdf
```

## トラブルシューティング

- **`state.json が見つかりません`**: 先に `login` サブコマンドを実行
- **注釈の番号が UI とズレる**: `apps/<app_id>.ts` のセレクタが変更後の DOM と一致していない。ソースを再読して選び直す
- **画面が空 / ローディングのまま撮影される**: `waitForSelector` を確実に描画される要素に変える
- **予約 ID など動的 param が取れない**: 対象 SPA にサンプルデータ（予約 1 件以上）が入っているか確認
- **ログインセッションが切れた**: `.work/<app_id>/profile/` を削除し `login` からやり直す

## やってはいけないこと

- `scripts/manual/src/template.ts` を app 個別の都合で変更しない（一貫性が壊れる）。デザイン方針を変えたい場合は必ずユーザーに確認
- 注釈を 6 個以上にしない（PDF が縦に伸びて読みにくくなる）
- スクショに個人情報が写る場合は事前にテストデータへ差し替える
- `.work/` の中身をコミットしない（`.gitignore` 済み）
