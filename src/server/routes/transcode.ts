import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { config } from "../../shared/config.js";
import { createTranscodeQueue } from "../../shared/queue.js";

const queue = createTranscodeQueue();

async function handleTranscodeRequest(file: MultipartFile, outputFormat: string) {
  await mkdir(config.storagePath, { recursive: true });

  const jobId = randomUUID();
  const ext = path.extname(file.filename);
  const savedFilename = `${jobId}${ext}`;
  const savedPath = path.join(config.storagePath, savedFilename);

  await pipeline(file.file, createWriteStream(savedPath));

  await queue.add("transcode", {
    jobId,
    savedFilename,
    originalFilename: file.filename,
    outputFormat,
  }, { jobId });

  return jobId;
}

export async function transcodeRoute(app: FastifyInstance) {
  app.post("/transcode", async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: "No file provided" });
    }

    const outputFormat = (data.fields.outputFormat as { value: string } | undefined)?.value;
    if (!outputFormat) {
      return reply.code(400).send({ error: "outputFormat is required" });
    }

    const jobId = await handleTranscodeRequest(data, outputFormat);

    return reply.code(202).send({ jobId });
  });
}
