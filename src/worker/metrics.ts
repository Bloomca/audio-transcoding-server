import { createServer } from "node:http";
import type { Worker } from "bullmq";
import { collectDefaultMetrics, Counter, Histogram, Registry } from "prom-client";
import type { TranscodeJobData, TranscodeJobResult } from "../shared/jobs.js";

const metricsRegistry = new Registry();
collectDefaultMetrics({
  register: metricsRegistry,
  prefix: "audio_transcoding_worker_",
});

const jobsStartedTotal = new Counter({
  name: "audio_transcoding_worker_jobs_started_total",
  help: "Total number of transcoding jobs started by the worker",
  registers: [metricsRegistry],
});

const jobsCompletedTotal = new Counter({
  name: "audio_transcoding_worker_jobs_completed_total",
  help: "Total number of transcoding jobs completed by the worker",
  registers: [metricsRegistry],
});

const jobsFailedTotal = new Counter({
  name: "audio_transcoding_worker_jobs_failed_total",
  help: "Total number of transcoding jobs failed in the worker",
  registers: [metricsRegistry],
});

const jobDurationSeconds = new Histogram({
  name: "audio_transcoding_worker_job_duration_seconds",
  help: "Duration of transcoding jobs in seconds",
  labelNames: ["status"] as const,
  buckets: [1, 2, 5, 10, 20, 30, 60, 120, 300, 600, 1200],
  registers: [metricsRegistry],
});

const jobStartTimes = new Map<string, bigint>();

type WorkerJobLike = { id?: string | number | null; data: TranscodeJobData };

function getJobKey(job: WorkerJobLike) {
  return String(job.id ?? job.data.jobId);
}

function observeJobDuration(job: WorkerJobLike, status: "completed" | "failed") {
  const key = getJobKey(job);
  const startedAt = jobStartTimes.get(key);
  if (!startedAt) return;

  const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
  jobDurationSeconds.observe({ status }, durationSeconds);
  jobStartTimes.delete(key);
}

export function attachWorkerMetrics(worker: Worker<TranscodeJobData, TranscodeJobResult>) {
  worker.on("active", (job) => {
    jobsStartedTotal.inc();
    jobStartTimes.set(getJobKey(job), process.hrtime.bigint());
  });

  worker.on("completed", (job) => {
    jobsCompletedTotal.inc();
    observeJobDuration(job, "completed");
  });

  worker.on("failed", (job) => {
    jobsFailedTotal.inc();
    if (job) {
      observeJobDuration(job, "failed");
    }
  });
}

export function startWorkerMetricsServer(port: number) {
  const metricsServer = createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/metrics") {
      response.statusCode = 200;
      response.setHeader("Content-Type", metricsRegistry.contentType);
      response.end(await metricsRegistry.metrics());
      return;
    }

    if (request.method === "GET" && request.url === "/healthz") {
      response.statusCode = 200;
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.end("ok");
      return;
    }

    response.statusCode = 404;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end("Not found");
  });

  metricsServer.listen(port, "0.0.0.0");

  return metricsServer;
}
