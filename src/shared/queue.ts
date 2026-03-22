import { Queue } from "bullmq";
import { config } from "./config.js";
import type { TranscodeJobData, TranscodeJobResult } from "./jobs.js";

export const TRANSCODE_QUEUE = "transcode";

export function createTranscodeQueue() {
  return new Queue<TranscodeJobData, TranscodeJobResult>(TRANSCODE_QUEUE, {
    connection: { url: config.redisUrl },
  });
}
