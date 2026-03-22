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

async function submitTranscodeRequest(outputFormat = "mp3") {
  const app = buildApp();
  const form = buildForm({ outputFormat });
  const response = await app.inject({
    method: "POST",
    url: "/transcode",
    payload: form,
    headers: form.getHeaders(),
  });
  return { app, response, id: response.json().id };
}

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
});

describe("GET /status/:id", () => {
  it("returns 404 for unknown id", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/status/non-existent-id",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Processing request not found" });
  });

  it("returns pending status for a newly submitted request", async () => {
    const { app, id } = await submitTranscodeRequest();

    const response = await app.inject({
      method: "GET",
      url: `/status/${id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "pending" });
  });
});
