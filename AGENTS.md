# Arc - 未来予報 開発ルール

## アーキテクチャ
- 軽量DDD。domain / application / infrastructure / app(presentation) の4層
- domain 層は外部依存ゼロ（firebase / stripe 等を import しない）
- 集約をまたぐ処理は application 層の UseCase が責任を持つ

## 命名規則
- ファイル名はすべて kebab-case（例: booking-status.ts）
- Repository Interface は先頭 i-（例: i-booking-repository.ts）
- URL パスも kebab-case（Google URL 構造ガイドライン準拠）
- export 名は PascalCase（コンポーネント、クラス）/ camelCase（関数、変数）

## 技術スタック
- Next.js App Router / TypeScript / Firestore / Stripe / Zoom / Resend
- フォーム: React Hook Form + Valibot
- UI: ParkUI / カレンダー: react-big-calendar
- テスト: Vitest + React Testing Library
- Lint/Format: Biome

## やってはいけないこと
- domain 層に firebase-admin や stripe を import しない
- 集約の外から集約メンバーを直接変更しない
- any 型を使わない