import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { config } from "../../shared/config.js";
import { createTranscodeQueue } from "../../shared/queue.js";

const queue = createTranscodeQueue();

async function handleTranscodeRequest(
  savedFilename: string,
  originalFilename: string,
  outputFormat: string
) {
  const jobId = path.basename(savedFilename, path.extname(savedFilename));

  await queue.add(
    "transcode",
    { jobId, savedFilename, originalFilename, outputFormat },
    { jobId }
  );

  return jobId;
}

export async function transcodeRoute(app: FastifyInstance) {
  app.post("/transcode", async (request, reply) => {
    await mkdir(config.storagePath, { recursive: true });

    let savedFilename: string | undefined;
    let originalFilename: string | undefined;
    let outputFormat: string | undefined;

    for await (const part of request.parts()) {
      if (part.type === "file") {
        const ext = path.extname(part.filename);
        savedFilename = `${randomUUID()}${ext}`;
        originalFilename = part.filename;
        await pipeline(
          part.file,
          createWriteStream(path.join(config.storagePath, savedFilename))
        );
      } else if (part.fieldname === "outputFormat") {
        outputFormat = part.value as string;
      }
    }

    if (!savedFilename || !originalFilename) {
      return reply.code(400).send({ error: "No file provided" });
    }

    if (!outputFormat) {
      await unlink(path.join(config.storagePath, savedFilename));
      return reply.code(400).send({ error: "outputFormat is required" });
    }

    const jobId = await handleTranscodeRequest(
      savedFilename,
      originalFilename,
      outputFormat
    );

    return reply.code(202).send({ jobId });
  });
}
