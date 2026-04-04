import { access, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cleanupExpiredStorageFiles } from "./storage-cleanup.js";

describe("storage cleanup", () => {
  it("deletes expired files but keeps fresh and in-flight files", async () => {
    const storagePath = await mkdtemp(path.join(os.tmpdir(), "audio-cleanup-"));

    const expiredDelete = "expired-delete.flac";
    const expiredProtected = "expired-protected.flac";
    const freshFile = "fresh.flac";

    await writeFile(path.join(storagePath, expiredDelete), "a");
    await writeFile(path.join(storagePath, expiredProtected), "b");
    await writeFile(path.join(storagePath, freshFile), "c");

    const nowMs = Date.now();
    const expiredMs = nowMs - 6 * 60 * 60 * 1000;
    await utimes(
      path.join(storagePath, expiredDelete),
      expiredMs / 1000,
      expiredMs / 1000,
    );
    await utimes(
      path.join(storagePath, expiredProtected),
      expiredMs / 1000,
      expiredMs / 1000,
    );

    const queue = {
      getJobs: async () => [{ data: { savedFilename: expiredProtected } }],
    } as Parameters<typeof cleanupExpiredStorageFiles>[0]["queue"];

    const result = await cleanupExpiredStorageFiles({
      storagePath,
      ttlMs: 5 * 60 * 60 * 1000,
      queue,
      nowMs,
    });

    expect(result.deleted).toBe(1);
    await expect(
      access(path.join(storagePath, expiredDelete)),
    ).rejects.toThrow();
    await expect(
      access(path.join(storagePath, expiredProtected)),
    ).resolves.toBeUndefined();
    await expect(
      access(path.join(storagePath, freshFile)),
    ).resolves.toBeUndefined();

    await rm(storagePath, { recursive: true, force: true });
  });

  it("does nothing when storage path does not exist", async () => {
    const queue = {
      getJobs: async () => [],
    } as Parameters<typeof cleanupExpiredStorageFiles>[0]["queue"];

    const result = await cleanupExpiredStorageFiles({
      storagePath: path.join(
        os.tmpdir(),
        `audio-cleanup-missing-${Date.now()}`,
      ),
      ttlMs: 5 * 60 * 60 * 1000,
      queue,
    });

    expect(result.deleted).toBe(0);
  });
});
