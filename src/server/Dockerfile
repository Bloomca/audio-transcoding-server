FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/server ./src/server
COPY src/shared ./src/shared

CMD ["node", "dist/server/index.js"]
