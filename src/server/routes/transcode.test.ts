import { access } from "node:fs/promises";
import path from "node:path";
import FormData from "form-data";
import { describe, expect, it } from "vitest";
import { config } from "../../shared/config.js";
import { buildApp } from "../app.js";
import { addJobToSession, getOrCreateSession } from "../session-store.js";
import {
  buildForm,
  submitTranscodeRequest,
  useQueue,
} from "../test-helpers.js";

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
    expect(job?.opts.removeOnComplete).toMatchObject({
      age: config.storageFileTtlSeconds,
    });
  });

  it("saves the file to storage", async () => {
    const { id } = await submitTranscodeRequest();

    const job = await queue.getJob(id);
    expect(job).toBeDefined();
    if (!job) throw new Error("Expected queued job to exist");

    const filePath = path.join(config.storagePath, job.data.savedFilename);
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

  it("returns 429 after too many /transcode requests in the time window", async () => {
    const app = buildApp();

    for (let i = 0; i < config.transcodeRateLimitMaxRequests; i += 1) {
      const form = buildForm({ outputFormat: "mp3" });
      const response = await app.inject({
        method: "POST",
        url: "/transcode",
        payload: form,
        headers: form.getHeaders(),
      });

      expect(response.statusCode).toBe(202);
    }

    const limitedForm = buildForm({ outputFormat: "mp3" });
    const limitedResponse = await app.inject({
      method: "POST",
      url: "/transcode",
      payload: limitedForm,
      headers: limitedForm.getHeaders(),
    });

    expect(limitedResponse.statusCode).toBe(429);

    await app.close();
  });

  it("returns 429 when session has too many in-flight jobs", async () => {
    if (config.maxInFlightJobsPerSession >= config.maxQueueDepth) {
      throw new Error(
        "Expected MAX_IN_FLIGHT_JOBS_PER_SESSION to be less than MAX_QUEUE_DEPTH",
      );
    }

    const { sessionId } = getOrCreateSession(undefined);

    await Promise.all(
      Array.from({ length: config.maxInFlightJobsPerSession }, (_, index) => {
        const jobId = `session-limit-${index}`;
        addJobToSession(sessionId, jobId);
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
      headers: { ...form.getHeaders(), Cookie: `sessionId=${sessionId}` },
    });

    expect(response.statusCode).toBe(429);
    expect(response.headers["retry-after"]).toBe(
      String(config.sessionLimitRetryAfterSecs),
    );
    expect(response.json()).toEqual({
      error: "Too many in-flight requests in this session",
    });
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
