import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { config } from "../../shared/config.js";

async function handleTranscodeRequest(file: MultipartFile) {
  await mkdir(config.storagePath, { recursive: true });

  const ext = path.extname(file.filename);
  const savedFilename = `${randomUUID()}${ext}`;
  const savedPath = path.join(config.storagePath, savedFilename);

  await pipeline(file.file, createWriteStream(savedPath));
}

export async function transcodeRoute(app: FastifyInstance) {
  app.post("/transcode", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "No file provided" });
    }

    await handleTranscodeRequest(file);

    return reply.code(202).send({ status: "accepted" });
  });
}
