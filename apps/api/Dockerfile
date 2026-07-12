# みらい予報 API サーバー（Hono + @hono/node-server）を Cloud Run で動かすためのイメージ。
# リポジトリルートをビルドコンテキストとして実行する:
#   gcloud builds submit --config=apps/api/cloudbuild.yaml ...
#
# esbuild でアプリコード（@mirai-yoho/shared / hono 含む）を dist/server.js に
# 単一バンドルする。firebase-admin / stripe 等の重い依存は external のまま
# node_modules から解決する（コールドスタート短縮のためモジュール解決 I/O を最小化）。

FROM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable

# ワークスペースのマニフェストのみ先に copy して install レイヤをキャッシュする。
# API は @mirai-yoho/shared のみに依存する（"@mirai-yoho/api..." で推移的依存も含める）。
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
# build には devDependencies（esbuild / typescript 等）が要るため --prod は付けない。
# prepare フック（husky）は不要なので --ignore-scripts でスキップする。
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "@mirai-yoho/api..."

# ソースを copy して esbuild でバンドルする。
COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN pnpm --filter @mirai-yoho/api build

# ---- runtime ----
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Cloud Run は $PORT でリッスンさせる。src/server/index.ts は PORT / HOSTNAME を尊重する。
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN corepack enable

# external にした依存（firebase-admin / stripe 等）だけを prod install する。
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter "@mirai-yoho/api..."

# 非 root で実行する。
RUN addgroup -S nodejs && adduser -S api -G nodejs

COPY --from=builder --chown=api:nodejs /app/apps/api/dist apps/api/dist

USER api

EXPOSE 8080

CMD ["node", "apps/api/dist/server.js"]
