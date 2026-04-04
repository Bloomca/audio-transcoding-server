import os from "node:os";
import path from "node:path";

export const config = {
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  storagePath:
    process.env.STORAGE_PATH ?? path.join(os.tmpdir(), "audio-transcoding"),
  port: parseInt(process.env.PORT ?? "3000", 10),
  maxFileSizeBytes:
    parseInt(process.env.MAX_FILE_SIZE_MB ?? "100", 10) * 1024 * 1024,
  maxQueueDepth: parseInt(process.env.MAX_QUEUE_DEPTH ?? "30", 10),
  queueBusyRetryAfterSecs: parseInt(
    process.env.QUEUE_BUSY_RETRY_AFTER_SECS ?? "60",
    10,
  ),
  maxInFlightJobsPerSession: parseInt(
    process.env.MAX_IN_FLIGHT_JOBS_PER_SESSION ?? "20",
    10,
  ),
  sessionLimitRetryAfterSecs: parseInt(
    process.env.SESSION_LIMIT_RETRY_AFTER_SECS ?? "60",
    10,
  ),
  rateLimitMaxRequests: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS ?? "120",
    10,
  ),
  rateLimitTimeWindowMs: parseInt(
    process.env.RATE_LIMIT_TIME_WINDOW_MS ?? "60000",
    10,
  ),
  transcodeRateLimitMaxRequests: parseInt(
    process.env.TRANSCODE_RATE_LIMIT_MAX_REQUESTS ?? "20",
    10,
  ),
  transcodeRateLimitTimeWindowMs: parseInt(
    process.env.TRANSCODE_RATE_LIMIT_TIME_WINDOW_MS ?? "60000",
    10,
  ),
  storageFileTtlHours: parseInt(process.env.STORAGE_FILE_TTL_HOURS ?? "5", 10),
  storageFileTtlSeconds:
    parseInt(process.env.STORAGE_FILE_TTL_HOURS ?? "5", 10) * 60 * 60,
  storageCleanupIntervalMinutes: parseInt(
    process.env.STORAGE_CLEANUP_INTERVAL_MINUTES ?? "15",
    10,
  ),
};
