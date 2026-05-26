FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@8 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/indexer/package.json ./packages/indexer/
RUN pnpm install --frozen-lockfile --filter @ethora/indexer

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter @ethora/indexer build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/packages/indexer/dist ./dist
COPY --from=build /app/packages/indexer/package.json ./
COPY --from=deps /app/node_modules ./node_modules

CMD ["node", "dist/index.js"]
