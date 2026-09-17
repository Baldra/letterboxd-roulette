# ---- Build stage -----------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Install with workspace manifests only so npm ci can resolve all workspaces.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
RUN npm ci

# Compile everything (shared types, API to dist, web to dist).
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
RUN npm run build

# ---- Runtime stage ---------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/packages/shared               ./packages/shared
COPY --from=build /app/packages/api/package.json     ./packages/api/
COPY --from=build /app/packages/api/dist             ./packages/api/dist
COPY --from=build /app/packages/web/dist             ./packages/web/dist
COPY --from=build /app/node_modules                  ./node_modules

ENV PORT=8080
EXPOSE 8080

CMD ["node", "packages/api/dist/src/server.js"]