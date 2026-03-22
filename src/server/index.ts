import Fastify from "fastify";
import { transcodeRoute } from "./routes/transcode.js";

const app = Fastify({ logger: true });

app.register(transcodeRoute);

app.listen({ port: 3000, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
