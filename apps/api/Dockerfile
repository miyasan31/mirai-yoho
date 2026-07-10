# 未来予報 API サーバー（Next.js Route Handlers）を Cloud Run で動かすためのイメージ。
# リポジトリルートをビルドコンテキストとして実行する:
#   gcloud builds submit --config=apps/api/cloudbuild.yaml ...
#
# next.config.ts の output: "standalone" + outputFileTracingRoot=リポジトリルートにより、
# standalone 出力は apps/api/.next/standalone/apps/api/server.js に生成される。

FROM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable

# ワークスペースのマニフェストのみ先に copy して install レイヤをキャッシュする。
# API は @mirai-yoho/shared のみに依存する（"@mirai-yoho/api..." で推移的依存も含める）。
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
# build には devDependencies（next / typescript 等）が要るため --prod は付けない。
# prepare フック（husky）は不要なので --ignore-scripts でスキップする。
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "@mirai-yoho/api..."

# ソースを copy して Next.js を standalone ビルドする。
COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN pnpm --filter @mirai-yoho/api build

# ---- runtime ----
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Cloud Run は $PORT でリッスンさせる。Next standalone server.js は PORT / HOSTNAME を尊重する。
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# 非 root で実行する。
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# standalone 出力を copy する。
# outputFileTracingRoot=リポジトリルートのため standalone はリポジトリ構造を保持しており、
# server.js は apps/api/server.js、依存は node_modules / packages/shared に含まれる。
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next/static ./apps/api/.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "apps/api/server.js"]
