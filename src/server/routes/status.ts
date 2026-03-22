import type { FastifyInstance } from "fastify";
import { createTranscodeQueue } from "../../shared/queue.js";

const queue = createTranscodeQueue();

export async function statusRoute(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/status/:id", async (request, reply) => {
    const { id } = request.params;

    const job = await queue.getJob(id);
    if (!job) {
      return reply.code(404).send({ error: "Processing request not found" });
    }

    const state = await job.getState();

    if (state === "completed") {
      return reply.send({
        status: "completed",
        outputFilename: job.returnvalue.outputFilename,
      });
    }

    if (state === "failed") {
      return reply.send({ status: "failed", error: job.failedReason });
    }

    if (state === "active") {
      return reply.send({ status: "processing", progress: job.progress ?? 0 });
    }

    return reply.send({ status: "pending" });
  });
}
