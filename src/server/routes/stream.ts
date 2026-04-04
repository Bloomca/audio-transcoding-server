import type { JobProgress } from "bullmq";
import type { FastifyInstance } from "fastify";
import type { TranscodeJobResult } from "../../shared/jobs.js";
import { createQueueEvents, createTranscodeQueue } from "../../shared/queue.js";
import {
  getOrCreateSession,
  getSessionJobs,
  sessionCookie,
} from "../session-store.js";

const queue = createTranscodeQueue();
const queueEvents = createQueueEvents();

export async function streamRoute(app: FastifyInstance) {
  app.get("/status/stream", async (request, reply) => {
    const { sessionId, isNew } = getOrCreateSession(request.headers.cookie);
    const sessionJobs = getSessionJobs(sessionId);
    if (!sessionJobs) {
      return reply.code(500).send({ error: "Failed to initialize session" });
    }

    reply.hijack();

    const res = reply.raw;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (isNew) {
      res.setHeader("Set-Cookie", sessionCookie(sessionId));
    }
    res.flushHeaders();

    function send(data: object) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    // Snapshot: send current state of all jobs already in the session
    // and prune stale IDs that no longer exist in BullMQ.
    for (const jobId of [...sessionJobs]) {
      const job = await queue.getJob(jobId);
      if (!job) {
        sessionJobs.delete(jobId);
        continue;
      }

      const state = await job.getState();

      if (state === "completed") {
        const result = job.returnvalue as TranscodeJobResult;
        send({
          jobId,
          status: "completed",
          outputFilename: result.outputFilename,
        });
      } else if (state === "failed") {
        send({ jobId, status: "failed", error: job.failedReason });
      } else if (state === "active") {
        send({ jobId, status: "processing", progress: job.progress ?? 0 });
      } else {
        send({ jobId, status: "pending" });
      }
    }

    // Stream live events, filtered to this session's jobs
    function onProgress({ jobId, data }: { jobId: string; data: JobProgress }) {
      if (!sessionJobs.has(jobId)) return;
      send({ jobId, status: "processing", progress: data });
    }

    function onCompleted({
      jobId,
      returnvalue,
    }: {
      jobId: string;
      returnvalue: string;
    }) {
      if (!sessionJobs.has(jobId)) return;
      // BullMQ's type declares returnvalue as string (the raw Redis value), but v5 calls JSON.parse
      // on it internally before emitting (queue-events.js:103), so the runtime value is already a
      // parsed object. Cast reflects reality; see https://github.com/taskforcesh/bullmq/issues/1304
      const result = returnvalue as unknown as TranscodeJobResult;
      send({
        jobId,
        status: "completed",
        outputFilename: result.outputFilename,
      });
    }

    function onFailed({
      jobId,
      failedReason,
    }: {
      jobId: string;
      failedReason: string;
    }) {
      if (!sessionJobs.has(jobId)) return;
      send({ jobId, status: "failed", error: failedReason });
    }

    queueEvents.on("progress", onProgress);
    queueEvents.on("completed", onCompleted);
    queueEvents.on("failed", onFailed);

    request.raw.on("close", () => {
      queueEvents.off("progress", onProgress);
      queueEvents.off("completed", onCompleted);
      queueEvents.off("failed", onFailed);
      res.end();
    });
  });
}
