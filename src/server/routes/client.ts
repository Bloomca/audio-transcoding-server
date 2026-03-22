import fastifyStatic from "@fastify/static";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";

const routesDir = path.dirname(fileURLToPath(import.meta.url));
const sourceClientDir = path.resolve(routesDir, "../../client");
const builtClientDir = path.resolve(routesDir, "../../../dist/client");
const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";

async function sendClientFile(
  reply: { type: (value: string) => typeof reply; send: (value: string) => unknown },
  rootDir: string,
  filename: string
) {
  const filePath = path.join(rootDir, filename);
  const content = await readFile(filePath, "utf8");
  return reply.type("text/html; charset=utf-8").send(content);
}

export async function clientRoute(app: FastifyInstance) {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  if (nodeEnv === "production") {
    await app.register(fastifyStatic, {
      root: builtClientDir,
      maxAge: "30d",
      immutable: true,
    });

    app.get("/", async (_request, reply) => {
      return reply.sendFile("index.html", { maxAge: 0, immutable: false });
    });

    return;
  }

  if (nodeEnv === "test") {
    app.get("/", async (_request, reply) => {
      return sendClientFile(reply, sourceClientDir, "index.html");
    });

    return;
  }

  app.get("/", async (_request, reply) => {
    return reply.redirect(viteDevServerUrl);
  });
}
