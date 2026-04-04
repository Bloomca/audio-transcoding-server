import { config } from "../shared/config.js";
import { buildApp } from "./app.js";
import { startStorageCleanupScheduler } from "./storage-cleanup.js";

const app = buildApp();

let stopStorageCleanup: (() => Promise<void>) | null = null;
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  app.log.info(`Shutting down on ${signal}`);

  try {
    if (stopStorageCleanup) {
      await stopStorageCleanup();
    }
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

app.listen({ port: config.port, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  const ttlMs = Math.max(1, config.storageFileTtlHours) * 60 * 60 * 1000;
  const intervalMs = Math.max(1, config.storageCleanupIntervalMinutes) * 60 * 1000;

  stopStorageCleanup = startStorageCleanupScheduler({
    storagePath: config.storagePath,
    ttlMs,
    intervalMs,
    logger: {
      info: (message) => app.log.info(message),
      warn: (message) => app.log.warn(message),
      error: (message) => app.log.error(message),
    },
  });

  app.log.info(
    `Storage cleanup started (ttl=${config.storageFileTtlHours}h, interval=${config.storageCleanupIntervalMinutes}m)`,
  );
});
