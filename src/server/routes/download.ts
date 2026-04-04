import { createReadStream } from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { config } from "../../shared/config.js";
import { FORMAT_EXTENSIONS } from "../../shared/formats.js";
import { createTranscodeQueue } from "../../shared/queue.js";

const queue = createTranscodeQueue();

export async function downloadRoute(app: FastifyInstance) {
  app.get<{
    Params: { filename: string };
    Querystring: { id?: string };
  }>("/download/:filename", async (request, reply) => {
    const { filename } = request.params;
    const { id } = request.query;

    if (!id) {
      return reply.code(400).send({ error: "id is required" });
    }

    const job = await queue.getJob(id);
    if (!job) {
      return reply.code(404).send({ error: "Processing request not found" });
    }

    const state = await job.getState();
    if (state !== "completed") {
      return reply.code(400).send({ error: "Processing not completed" });
    }

    if (job.returnvalue.outputFilename !== path.basename(filename)) {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const filePath = path.join(config.storagePath, path.basename(filename));

    const originalBasename = path.basename(
      job.data.originalFilename,
      path.extname(job.data.originalFilename),
    );
    const downloadFilename = `${originalBasename}.${FORMAT_EXTENSIONS[job.data.outputFormat]}`;

    const stream = createReadStream(filePath);
    stream.on("error", () => {
      reply.code(404).send({ error: "File not found" });
    });

    // Use RFC 5987 encoding so non-ASCII filenames don't throw ERR_INVALID_CHAR.
    // filename= is an ASCII fallback (non-ASCII replaced with _); filename*= carries the real name.
    const asciiFallback = downloadFilename.replace(/[^\x20-\x7E]/g, "_");
    const encoded = encodeURIComponent(downloadFilename);
    return reply
      .header(
        "Content-Disposition",
        `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`,
      )
      .header("Content-Type", "application/octet-stream")
      .send(stream);
  });
}
