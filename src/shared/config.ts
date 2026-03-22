import path from "node:path";
import os from "node:os";

export const config = {
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  storagePath:
    process.env.STORAGE_PATH ?? path.join(os.tmpdir(), "audio-transcoding"),
  port: parseInt(process.env.PORT ?? "3000", 10),
};
