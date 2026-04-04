import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import type { Queue } from "bullmq";
import type { TranscodeJobData, TranscodeJobResult } from "../shared/jobs.js";
import { createTranscodeQueue } from "../shared/queue.js";

type QueueLike = Pick<Queue<TranscodeJobData, TranscodeJobResult>, "getJobs">;

type LoggerLike = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export async function cleanupExpiredStorageFiles(options: {
  storagePath: string;
  ttlMs: number;
  queue: QueueLike;
  nowMs?: number;
}) {
  const { storagePath, ttlMs, queue, nowMs = Date.now() } = options;

  const inFlightJobs = await queue.getJobs(["waiting", "active", "delayed"]);
  const protectedFilenames = new Set(
    inFlightJobs
      .map((job) => job.data.savedFilename)
      .filter((filename): filename is string => Boolean(filename)),
  );

  let deleted = 0;

  const entries = await readdir(storagePath, { withFileTypes: true }).catch(
    (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    },
  );

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (protectedFilenames.has(entry.name)) continue;

    const filePath = path.join(storagePath, entry.name);
    const fileStats = await stat(filePath).catch(() => null);
    if (!fileStats) continue;

    const ageMs = nowMs - fileStats.mtimeMs;
    if (ageMs < ttlMs) continue;

    await unlink(filePath).catch(() => undefined);
    deleted += 1;
  }

  return { deleted };
}

export function startStorageCleanupScheduler(options: {
  storagePath: string;
  ttlMs: number;
  intervalMs: number;
  logger?: LoggerLike;
}) {
  const { storagePath, ttlMs, intervalMs, logger } = options;
  const queue = createTranscodeQueue();

  let cleanupInProgress = false;

  async function runCleanup() {
    if (cleanupInProgress) return;

    cleanupInProgress = true;
    try {
      const { deleted } = await cleanupExpiredStorageFiles({
        storagePath,
        ttlMs,
        queue,
      });

      if (deleted > 0) {
        logger?.info(`Storage cleanup removed ${deleted} expired file(s)`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger?.error(`Storage cleanup failed: ${message}`);
    } finally {
      cleanupInProgress = false;
    }
  }

  const timer = setInterval(() => {
    void runCleanup();
  }, intervalMs);
  timer.unref?.();

  void runCleanup();

  return async () => {
    clearInterval(timer);
    await queue.close();
  };
}
