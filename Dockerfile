# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM build-deps AS build
COPY tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm run build

FROM node:24-bookworm-slim AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:24-bookworm-slim AS server
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server/index.js"]

FROM node:24-bookworm-slim AS worker
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
CMD ["node", "dist/worker/index.js"]
