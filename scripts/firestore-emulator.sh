#!/bin/sh
# ローカル開発用の Firestore エミュレーターを起動する。
#
# - データは .emulator-data/ に永続化し（終了時にエクスポート）、次回起動時に読み込む
# - project は apps/api/.env.local の FIREBASE_PROJECT_ID と一致させる必要がある
#   （Firebase Auth はエミュレートせず dev プロジェクトの本物を使うため、
#     admin SDK が Firestore / Auth 共通で使う project id を揃える）
#
# Usage:
#   pnpm emulator
#   FIREBASE_PROJECT_ID=<projectId> pnpm emulator
set -eu

PROJECT_ID="${FIREBASE_PROJECT_ID:-mirai-yoho-dev}"
DATA_DIR=".emulator-data"

set -- --only firestore --project "$PROJECT_ID" --export-on-exit "$DATA_DIR"

# 初回起動時は .emulator-data/ が空なので --import を付けない（付けると起動が失敗する）
if [ -f "$DATA_DIR/firebase-export-metadata.json" ]; then
  set -- "$@" --import "$DATA_DIR"
fi

exec firebase emulators:start "$@"
