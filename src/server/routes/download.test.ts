import { describe, it, expect, afterAll } from "vitest";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import FormData from "form-data";
import { Worker } from "bullmq";
import { buildApp } from "../app.js";
import { config } from "../../shared/config.js";
import { TRANSCODE_QUEUE } from "../../shared/queue.js";
import { processTranscodeJob } from "../../worker/processor.js";
import type { TranscodeJobData, TranscodeJobResult } from "../../shared/jobs.js";
import { useQueue } from "../test-helpers.js";

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../fixtures");

useQueue();

const worker = new Worker<TranscodeJobData, TranscodeJobResult>(
  TRANSCODE_QUEUE,
  processTranscodeJob,
  { connection: { url: config.redisUrl } }
);

afterAll(async () => {
  await worker.close();
});

async function submitRealFile(outputFormat = "mp3") {
  const app = buildApp();
  const fileBuffer = await readFile(path.join(FIXTURES_DIR, "test.flac"));

  const form = new FormData();
  form.append("file", fileBuffer, { filename: "test.flac", contentType: "audio/flac" });
  form.append("outputFormat", outputFormat);

  const response = await app.inject({
    method: "POST",
    url: "/transcode",
    payload: form,
    headers: form.getHeaders(),
  });

  return { app, id: response.json().id as string };
}

async function waitForOutputFile(outputFilename: string, timeoutMs = 25_000): Promise<void> {
  const outputPath = path.join(config.storagePath, outputFilename);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await access(outputPath);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`Output file not found after ${timeoutMs}ms`);
}

describe("GET /download/:filename", () => {
  it("streams the transcoded file with correct headers", async () => {
    const { app, id } = await submitRealFile();
    const outputFilename = `${id}-output.mp3`;

    await waitForOutputFile(outputFilename);

    const response = await app.inject({
      method: "GET",
      url: `/download/${outputFilename}?id=${id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-disposition"]).toBe('attachment; filename="test.mp3"');
    expect(response.headers["content-type"]).toBe("application/octet-stream");
    expect(response.rawPayload.length).toBeGreaterThan(0);
  }, 30_000);

  it("returns 400 when id is not provided", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/download/some-file.mp3",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "id is required" });
  });

  it("returns 404 for unknown id", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/download/some-file.mp3?id=unknown-id",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Processing request not found" });
  });

  it("returns 403 when filename does not match the request", async () => {
    const { app, id } = await submitRealFile();
    const outputFilename = `${id}-output.mp3`;

    await waitForOutputFile(outputFilename);

    const response = await app.inject({
      method: "GET",
      url: `/download/wrong-filename.mp3?id=${id}`,
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
  }, 30_000);
});
