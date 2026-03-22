FROM jrottenberg/ffmpeg:7-alpine AS ffmpeg

FROM node:24-alpine

COPY --from=ffmpeg /usr/local/bin/ffmpeg /usr/local/bin/ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/worker ./src/worker
COPY src/shared ./src/shared

CMD ["node", "dist/worker/index.js"]
