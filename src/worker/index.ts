import { Worker } from "bullmq";
import { config } from "../shared/config.js";
import { TRANSCODE_QUEUE } from "../shared/queue.js";
import type { TranscodeJobData, TranscodeJobResult } from "../shared/jobs.js";
import { processTranscodeJob } from "./processor.js";
import { attachWorkerMetrics, startWorkerMetricsServer } from "./metrics.js";

const worker = new Worker<TranscodeJobData, TranscodeJobResult>(
  TRANSCODE_QUEUE,
  processTranscodeJob,
  { connection: { url: config.redisUrl } }
);

attachWorkerMetrics(worker);

worker.on("completed", (job) => {
  console.log(`Job ${job.data.jobId} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.data.jobId} failed:`, error);
});

const metricsPort = Number.parseInt(process.env.WORKER_METRICS_PORT ?? "3001", 10);
startWorkerMetricsServer(metricsPort).on("listening", () => {
  console.log(`Worker metrics server listening on :${metricsPort}`);
});
