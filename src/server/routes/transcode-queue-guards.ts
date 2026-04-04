import type { Queue } from "bullmq";
import type {
  TranscodeJobData,
  TranscodeJobResult,
} from "../../shared/jobs.js";

export async function isQueueAtCapacity(
  queue: Queue<TranscodeJobData, TranscodeJobResult>,
  maxQueueDepth: number,
) {
  const counts = await queue.getJobCounts("waiting", "active", "delayed");
  const depth = counts.waiting + counts.active + counts.delayed;

  return depth >= maxQueueDepth;
}

export async function countSessionInFlightJobs(
  queue: Queue<TranscodeJobData, TranscodeJobResult>,
  sessionJobs: Set<string>,
) {
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
