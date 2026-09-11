# Easy Trip Nepal — API image (Arch §20.1: containerised, portable).
# Multi-stage: dependencies are installed with the workspace lockfile so the
# runtime image contains only what the API needs.
FROM node:22-alpine AS deps
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/
COPY packages/database/package.json packages/database/
COPY tests/package.json tests/
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /repo/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=deps /repo/packages/database/node_modules ./packages/database/node_modules
COPY . .
RUN pnpm --filter @easytrip/contracts build \
 && pnpm --filter @easytrip/database build \
 && pnpm --filter @easytrip/api build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=build /repo/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /repo/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build /repo/packages/database/dist ./packages/database/dist
COPY --from=build /repo/packages/database/migrations ./packages/database/migrations
COPY --from=build /repo/packages/database/package.json ./packages/database/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
EXPOSE 4000
USER node
ENTRYPOINT ["/sbin/tini", "--"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/main.js"]
