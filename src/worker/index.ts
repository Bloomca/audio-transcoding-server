import { Worker } from "bullmq";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { config } from "../shared/config.js";
import { TRANSCODE_QUEUE } from "../shared/queue.js";
import { FORMAT_EXTENSIONS } from "../shared/formats.js";
import type { TranscodeJobData, TranscodeJobResult } from "../shared/jobs.js";
import { transcode } from "./ffmpeg.js";

const worker = new Worker<TranscodeJobData, TranscodeJobResult>(
  TRANSCODE_QUEUE,
  async (job) => {
    const { jobId, savedFilename, outputFormat } = job.data;

    const inputPath = path.join(config.storagePath, savedFilename);
    const outputFilename = `${jobId}-output.${FORMAT_EXTENSIONS[outputFormat]}`;
    const outputPath = path.join(config.storagePath, outputFilename);

    await transcode({
      inputPath,
      outputPath,
      outputFormat,
      onProgress: (percent) => job.updateProgress(percent),
    });

    await unlink(inputPath);

    return { outputFilename };
  },
  { connection: { url: config.redisUrl } }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.data.jobId} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.data.jobId} failed:`, error);
});
