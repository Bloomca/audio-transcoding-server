import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { clientRoute } from "./routes/client.js";
import { transcodeRoute } from "./routes/transcode.js";
import { statusRoute } from "./routes/status.js";
import { streamRoute } from "./routes/stream.js";
import { downloadRoute } from "./routes/download.js";
import { config } from "../shared/config.js";

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(multipart, { limits: { fileSize: config.maxFileSizeBytes } });
  app.register(clientRoute);
  app.register(transcodeRoute);
  app.register(statusRoute);
  app.register(streamRoute);
  app.register(downloadRoute);
  return app;
}
