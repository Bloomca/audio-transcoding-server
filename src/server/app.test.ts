import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { access } from "node:fs/promises";
import path from "node:path";
import FormData from "form-data";
import { buildApp } from "./app.js";
import { createTranscodeQueue } from "../shared/queue.js";
import { config } from "../shared/config.js";

const queue = createTranscodeQueue();

beforeAll(async () => {
  await queue.obliterate({ force: true });
});

afterEach(async () => {
  await queue.obliterate({ force: true });
});

afterAll(async () => {
  await queue.close();
});

function buildForm(options: { file?: boolean; outputFormat?: string } = {}) {
  const form = new FormData();
  if (options.file !== false) {
    form.append("file", Buffer.from("fake audio content"), {
      filename: "test.flac",
      contentType: "audio/flac",
    });
  }
  if (options.outputFormat !== undefined) {
    form.append("outputFormat", options.outputFormat);
  }
  return form;
}

describe("POST /transcode", () => {
  it("returns 202 with jobId and enqueues a transcode job", async () => {
    const app = buildApp();
    const form = buildForm({ outputFormat: "mp3" });

    const response = await app.inject({
      method: "POST",
      url: "/transcode",
      payload: form,
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(202);

    const { jobId } = response.json();
    expect(typeof jobId).toBe("string");

    const job = await queue.getJob(jobId);
    expect(job).toBeDefined();
    expect(job?.data.jobId).toBe(jobId);
    expect(job?.data.outputFormat).toBe("mp3");
    expect(job?.data.originalFilename).toBe("test.flac");
    expect(job?.data.savedFilename).toMatch(/^[\w-]+\.flac$/);
  });

  it("saves the file to storage", async () => {
    const app = buildApp();
    const form = buildForm({ outputFormat: "mp3" });

    const response = await app.inject({
      method: "POST",
      url: "/transcode",
      payload: form,
      headers: form.getHeaders(),
    });

    const { jobId } = response.json();
    const job = await queue.getJob(jobId);
    const filePath = path.join(config.storagePath, job!.data.savedFilename);

    await expect(access(filePath)).resolves.toBeUndefined();
  });

  it("returns 400 when no file is provided", async () => {
    const app = buildApp();
    const form = buildForm({ file: false, outputFormat: "mp3" });

    const response = await app.inject({
      method: "POST",
      url: "/transcode",
      payload: form,
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "No file provided" });
  });

  it("returns 400 when outputFormat is not provided", async () => {
    const app = buildApp();
    const form = buildForm();

    const response = await app.inject({
      method: "POST",
      url: "/transcode",
      payload: form,
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "outputFormat is required" });
  });
});
