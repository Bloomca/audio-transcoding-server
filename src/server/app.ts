import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { transcodeRoute } from "./routes/transcode.js";

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(multipart);
  app.register(transcodeRoute);
  return app;
}
