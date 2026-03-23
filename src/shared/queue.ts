import { Queue, QueueEvents } from "bullmq";
import { config } from "./config.js";
import type { TranscodeJobData, TranscodeJobResult } from "./jobs.js";

export const TRANSCODE_QUEUE = "transcode";

const redisConnection = { url: config.redisUrl };

export function createTranscodeQueue() {
  return new Queue<TranscodeJobData, TranscodeJobResult>(TRANSCODE_QUEUE, {
    connection: redisConnection,
  });
}

export function createQueueEvents() {
  return new QueueEvents(TRANSCODE_QUEUE, { connection: redisConnection });
}
