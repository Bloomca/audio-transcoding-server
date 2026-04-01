import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { config } from "../../shared/config.js";
import { createTranscodeQueue } from "../../shared/queue.js";
import {
  isSupportedFormat,
  SUPPORTED_FORMATS,
  type OutputFormat,
} from "../../shared/formats.js";
import {
  getOrCreateSession,
  addJobToSession,
  sessionCookie,
} from "../session-store.js";

const queue = createTranscodeQueue();

async function handleTranscodeRequest(
  savedFilename: string,
  originalFilename: string,
  outputFormat: OutputFormat,
) {
  const jobId = path.basename(savedFilename, path.extname(savedFilename));

  await queue.add(
    "transcode",
    { jobId, savedFilename, originalFilename, outputFormat },
    { jobId },
  );

  return jobId;
}

async function removeUploadedFile(savedFilename: string) {
  await unlink(path.join(config.storagePath, savedFilename)).catch(
    () => undefined,
  );
}

export async function transcodeRoute(app: FastifyInstance) {
  app.post("/transcode", async (request, reply) => {
    await mkdir(config.storagePath, { recursive: true });

    let uploadedFile:
      | { savedFilename: string; originalFilename: string }
      | undefined;
    let outputFormat: string | undefined;

    for await (const part of request.parts()) {
      if (part.type === "file") {
        // multipart form can include multiple files, and there is no easy way
        // to verify this. We only support 1 file exclusively per request, so
        // in case there is more than 1 file attached, we delete the first file
        // and reply with 400
        if (uploadedFile) {
          part.file.resume();
          await removeUploadedFile(uploadedFile.savedFilename);
          return reply.code(400).send({ error: "Only one file is allowed" });
        }

        const ext = path.extname(part.filename);
        const savedFilename = `${randomUUID()}${ext}`;
        const originalFilename = part.filename;
        await pipeline(
          part.file,
          createWriteStream(path.join(config.storagePath, savedFilename)),
        );
        uploadedFile = { savedFilename, originalFilename };
      } else if (part.fieldname === "outputFormat") {
        outputFormat = part.value as string;
      }
    }

    if (!uploadedFile) {
      return reply.code(400).send({ error: "No file provided" });
    }

    const { savedFilename, originalFilename } = uploadedFile;

    if (!outputFormat) {
      await removeUploadedFile(savedFilename);
      return reply.code(400).send({ error: "outputFormat is required" });
    }

    if (!isSupportedFormat(outputFormat)) {
      await removeUploadedFile(savedFilename);
      return reply.code(400).send({
        error: `Unsupported output format. Supported formats: ${SUPPORTED_FORMATS.join(", ")}`,
      });
    }

    const jobId = await handleTranscodeRequest(
      savedFilename,
      originalFilename,
      outputFormat,
    );

    const { sessionId, isNew } = getOrCreateSession(request.headers.cookie);
    addJobToSession(sessionId, jobId);
    if (isNew) {
      reply.header("Set-Cookie", sessionCookie(sessionId));
    }

    return reply.code(202).send({ id: jobId });
  });
}
