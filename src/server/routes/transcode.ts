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
  getSessionJobs,
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

async function isQueueAtCapacity() {
  const counts = await queue.getJobCounts("waiting", "active", "delayed");
  const depth = counts.waiting + counts.active + counts.delayed;

  return depth >= config.maxQueueDepth;
}

type ReplyLike = {
  header: (name: string, value: string) => unknown;
  code: (statusCode: number) => { send: (payload: unknown) => unknown };
};

function replyQueueBusy(reply: ReplyLike) {
  reply.header("Retry-After", String(config.queueBusyRetryAfterSecs));
  return reply.code(503).send({ error: "Server is busy, retry later" });
}

function replySessionBusy(reply: ReplyLike) {
  reply.header("Retry-After", String(config.sessionLimitRetryAfterSecs));
  return reply
    .code(429)
    .send({ error: "Too many in-flight requests in this session" });
}

async function countSessionInFlightJobs(sessionJobs: Set<string>) {
  const jobIds = [...sessionJobs];
  let inFlightJobs = 0;

  for (const jobId of jobIds) {
    const job = await queue.getJob(jobId);
    if (!job) {
      sessionJobs.delete(jobId);
      continue;
    }

    const state = await job.getState();
    if (state === "completed" || state === "failed") {
      sessionJobs.delete(jobId);
      continue;
    }

    inFlightJobs += 1;
  }

  return inFlightJobs;
}

export async function transcodeRoute(app: FastifyInstance) {
  app.post("/transcode", async (request, reply) => {
    if (await isQueueAtCapacity()) {
      return replyQueueBusy(reply);
    }

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

    const { sessionId, isNew } = getOrCreateSession(request.headers.cookie);
    const sessionJobs = getSessionJobs(sessionId)!;

    const inFlightJobs = await countSessionInFlightJobs(sessionJobs);
    if (inFlightJobs >= config.maxInFlightJobsPerSession) {
      await removeUploadedFile(savedFilename);
      return replySessionBusy(reply);
    }

    if (await isQueueAtCapacity()) {
      await removeUploadedFile(savedFilename);
      return replyQueueBusy(reply);
    }

    const jobId = await handleTranscodeRequest(
      savedFilename,
      originalFilename,
      outputFormat,
    );

    addJobToSession(sessionId, jobId);
    if (isNew) {
      reply.header("Set-Cookie", sessionCookie(sessionId));
    }

    return reply.code(202).send({ id: jobId });
  });
}
