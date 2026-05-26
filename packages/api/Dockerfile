FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@8 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/sdk/package.json ./packages/sdk/
RUN pnpm install --frozen-lockfile --filter @ethora/api...

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter @ethora/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/packages/api/dist ./dist
COPY --from=build /app/packages/api/package.json ./
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]
