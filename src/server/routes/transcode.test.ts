import { describe, it, expect } from "vitest";
import path from "node:path";
import { access } from "node:fs/promises";
import FormData from "form-data";
import { buildApp } from "../app.js";
import { config } from "../../shared/config.js";
import { useQueue, buildForm, submitTranscodeRequest } from "../test-helpers.js";

const queue = useQueue();

describe("POST /transcode", () => {
  it("returns 202 with id and enqueues a transcode request", async () => {
    const { response, id } = await submitTranscodeRequest();

    expect(response.statusCode).toBe(202);
    expect(typeof id).toBe("string");

    const job = await queue.getJob(id);
    expect(job).toBeDefined();
    expect(job?.data.jobId).toBe(id);
    expect(job?.data.outputFormat).toBe("mp3");
    expect(job?.data.originalFilename).toBe("test.flac");
    expect(job?.data.savedFilename).toMatch(/^[\w-]+\.flac$/);
  });

  it("saves the file to storage", async () => {
    const { id } = await submitTranscodeRequest();

    const job = await queue.getJob(id);
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

  it("returns 400 when more than one file is provided", async () => {
    const app = buildApp();
    const form = new FormData();
    form.append("file", Buffer.from("first"), {
      filename: "first.flac",
      contentType: "audio/flac",
    });
    form.append("file", Buffer.from("second"), {
      filename: "second.flac",
      contentType: "audio/flac",
    });
    form.append("outputFormat", "mp3");

    const response = await app.inject({
      method: "POST",
      url: "/transcode",
      payload: form,
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Only one file is allowed" });
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

  it("returns 400 for unsupported outputFormat", async () => {
    const app = buildApp();
    const form = buildForm({ outputFormat: "wav" });

    const response = await app.inject({
      method: "POST",
      url: "/transcode",
      payload: form,
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain("Unsupported output format");
  });

  it("returns 503 when queue is at capacity", async () => {
    await Promise.all(
      Array.from({ length: config.maxQueueDepth }, (_, index) => {
        const jobId = `queued-${index}`;
        return queue.add(
          "transcode",
          {
            jobId,
            savedFilename: `${jobId}.flac`,
            originalFilename: `${jobId}.flac`,
            outputFormat: "mp3",
          },
          { jobId },
        );
      }),
    );

    const app = buildApp();
    const form = buildForm({ outputFormat: "mp3" });

    const response = await app.inject({
      method: "POST",
      url: "/transcode",
      payload: form,
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers["retry-after"]).toBe(
      String(config.queueBusyRetryAfterSecs),
    );
    expect(response.json()).toEqual({ error: "Server is busy, retry later" });
  });
});
