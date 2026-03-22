import type { FastifyInstance } from "fastify";

export async function transcodeRoute(app: FastifyInstance) {
  app.post("/transcode", async (_request, reply) => {
    return reply.code(202).send({ status: "accepted" });
  });
}
