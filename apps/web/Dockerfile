# Easy Trip Nepal — web image. `output: 'standalone'` (Arch §22) means the runtime
# stage only needs the self-contained Next.js bundle.
FROM node:22-alpine AS deps
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/
COPY packages/database/package.json packages/database/
COPY tests/package.json tests/
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_SITE_NAME="Easy Trip Nepal"
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /repo/packages/contracts/node_modules ./packages/contracts/node_modules
COPY . .
RUN pnpm --filter @easytrip/contracts build && pnpm --filter @easytrip/web build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
