import { describe, it, expect } from "vitest";
import path from "node:path";
import { access } from "node:fs/promises";
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
});
