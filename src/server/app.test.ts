import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import FormData from "form-data";
import { buildApp } from "./app.js";
import { createTranscodeQueue } from "../shared/queue.js";

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

describe("POST /transcode", () => {
  it("returns 202 with jobId and enqueues a transcode job", async () => {
    const app = buildApp();

    const form = new FormData();
    form.append("file", Buffer.from("fake audio content"), {
      filename: "test.flac",
      contentType: "audio/flac",
    });
    form.append("outputFormat", "mp3");

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
});
