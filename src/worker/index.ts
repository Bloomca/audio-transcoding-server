import { Worker } from "bullmq";
import { config } from "../shared/config.js";
import { TRANSCODE_QUEUE } from "../shared/queue.js";
import type { TranscodeJobData, TranscodeJobResult } from "../shared/jobs.js";
import { processTranscodeJob } from "./processor.js";

const worker = new Worker<TranscodeJobData, TranscodeJobResult>(
  TRANSCODE_QUEUE,
  processTranscodeJob,
  { connection: { url: config.redisUrl } }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.data.jobId} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.data.jobId} failed:`, error);
});
