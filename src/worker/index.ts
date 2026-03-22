import { Worker } from "bullmq";
import { config } from "../shared/config.js";
import { TRANSCODE_QUEUE } from "../shared/queue.js";
import type { TranscodeJobData } from "../shared/jobs.js";

const worker = new Worker<TranscodeJobData>(
  TRANSCODE_QUEUE,
  async (job) => {
    console.log(
      `Processing job ${job.data.jobId}: ${job.data.originalFilename} -> ${job.data.outputFormat}`
    );
    // TODO: call ffmpeg
  },
  { connection: { url: config.redisUrl } }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.data.jobId} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.data.jobId} failed:`, error);
});
