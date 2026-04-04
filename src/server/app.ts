import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { config } from "../shared/config.js";
import { registerMetrics } from "./metrics.js";
import { clientRoute } from "./routes/client.js";
import { downloadRoute } from "./routes/download.js";
import { statusRoute } from "./routes/status.js";
import { streamRoute } from "./routes/stream.js";
import { transcodeRoute } from "./routes/transcode.js";

export function buildApp() {
  const isTestEnv =
    process.env.NODE_ENV === "test" || process.env.VITEST === "true";

  const app = Fastify({ logger: !isTestEnv });

  app.register(rateLimit, {
    global: true,
    max: config.rateLimitMaxRequests,
    timeWindow: config.rateLimitTimeWindowMs,
    keyGenerator: (request) => request.ip,
  });

  app.register(multipart, { limits: { fileSize: config.maxFileSizeBytes } });
  registerMetrics(app);
  app.register(clientRoute);
  app.register(transcodeRoute);
  app.register(statusRoute);
  app.register(streamRoute);
  app.register(downloadRoute);
  return app;
}
