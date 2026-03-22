import Fastify from "fastify";
import { transcodeRoute } from "./routes/transcode.js";

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(transcodeRoute);
  return app;
}
