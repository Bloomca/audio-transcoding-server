import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import FormData from "form-data";
import { Worker } from "bullmq";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { config } from "../../shared/config.js";
import { TRANSCODE_QUEUE } from "../../shared/queue.js";
import { processTranscodeJob } from "../../worker/processor.js";
import type { TranscodeJobData, TranscodeJobResult } from "../../shared/jobs.js";
import { useQueue, buildForm } from "../test-helpers.js";
import {
  addJobToSession,
  getOrCreateSession,
  getSessionJobs,
} from "../session-store.js";

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures"
);

useQueue();

let app: FastifyInstance;
let port: number;

const worker = new Worker<TranscodeJobData, TranscodeJobResult>(
  TRANSCODE_QUEUE,
  processTranscodeJob,
  { connection: { url: config.redisUrl } }
);

beforeAll(async () => {
  app = buildApp();
  await app.listen({ port: 0, host: "127.0.0.1" });
  port = (app.server.address() as { port: number }).port;
});

afterAll(async () => {
  await worker.close();
  await app.close();
}, 15_000);

type StreamHandle = {
  headers: http.IncomingMessage["headers"];
  readEvent: (timeout?: number) => Promise<Record<string, unknown> | null>;
  close: () => void;
};

function openStream(cookie?: string): Promise<StreamHandle> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const pending: Array<(event: Record<string, unknown> | null) => void> = [];

    function flush() {
      while (pending.length > 0 && buffer.includes("\n\n")) {
        const boundary = buffer.indexOf("\n\n");
        const raw = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const dataLine = raw.split("\n").find((l) => l.startsWith("data: "));
        const event = dataLine ? (JSON.parse(dataLine.slice(6)) as Record<string, unknown>) : null;
        pending.shift()!(event);
      }
    }

    const req = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path: "/status/stream",
        headers: cookie ? { Cookie: cookie } : {},
      },
      (res) => {
        res.on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          flush();
        });

        resolve({
          headers: res.headers,
          readEvent: (timeout = 5000) =>
            new Promise((resolveEvent) => {
              pending.push(resolveEvent);
              flush();
              setTimeout(() => {
                const idx = pending.indexOf(resolveEvent);
                if (idx !== -1) {
                  pending.splice(idx, 1);
                  resolveEvent(null);
                }
              }, timeout);
            }),
          close: () => req.destroy(),
        });
      }
    );

    req.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code !== "ECONNRESET") reject(err);
    });
  });
}

async function submitJob(cookie?: string) {
  const form = buildForm({ outputFormat: "mp3" });
  const response = await app.inject({
    method: "POST",
    url: "/transcode",
    payload: form,
    headers: { ...form.getHeaders(), ...(cookie ? { Cookie: cookie } : {}) },
  });
  const jobId = response.json().id as string;
  const raw = response.headers["set-cookie"];
  const newCookie = (Array.isArray(raw) ? raw[0] : raw)?.split(";")[0];
  return { jobId, newCookie };
}

async function submitRealJob(cookie?: string) {
  const fileBuffer = await readFile(path.join(FIXTURES_DIR, "test.flac"));
  const form = new FormData();
  form.append("file", fileBuffer, { filename: "test.flac", contentType: "audio/flac" });
  form.append("outputFormat", "mp3");

  const response = await app.inject({
    method: "POST",
    url: "/transcode",
    payload: form,
    headers: { ...form.getHeaders(), ...(cookie ? { Cookie: cookie } : {}) },
  });
  const jobId = response.json().id as string;
  const raw = response.headers["set-cookie"];
  const newCookie = (Array.isArray(raw) ? raw[0] : raw)?.split(";")[0];
  return { jobId, newCookie };
}

describe("GET /status/stream", () => {
  it("responds with SSE headers and sets a session cookie", async () => {
    const { headers, close } = await openStream();

    expect(headers["content-type"]).toBe("text/event-stream");
    expect(headers["cache-control"]).toBe("no-cache");
    expect(headers["set-cookie"]).toBeDefined();
    expect((headers["set-cookie"] as string[])[0]).toMatch(/^sessionId=.+; HttpOnly/);

    close();
  });

  it("does not set a new cookie when reconnecting with an existing session", async () => {
    const first = await openStream();
    const sessionCookie = (first.headers["set-cookie"] as string[])[0].split(";")[0];
    first.close();

    const second = await openStream(sessionCookie);
    expect(second.headers["set-cookie"]).toBeUndefined();
    second.close();
  });

  it("sends a snapshot for jobs submitted before connecting", async () => {
    const { jobId, newCookie } = await submitJob();

    const { readEvent, close } = await openStream(newCookie);
    const event = await readEvent();

    expect(event?.jobId).toBe(jobId);
    expect(["pending", "processing"]).toContain(event?.status);

    close();
  });

  it("sends snapshot for multiple jobs in the session", async () => {
    const { newCookie } = await submitJob();
    const sessionCookie = newCookie!;
    const { jobId: jobId2 } = await submitJob(sessionCookie);

    const { readEvent, close } = await openStream(sessionCookie);
    const event1 = await readEvent();
    const event2 = await readEvent();

    const jobIds = [event1?.jobId, event2?.jobId];
    expect(jobIds).toContain(jobId2);

    close();
  });

  it("prunes stale session job ids that no longer exist in the queue", async () => {
    const { sessionId } = getOrCreateSession(undefined);
    const staleJobId = "stale-job-id";
    addJobToSession(sessionId, staleJobId);

    const { readEvent, close } = await openStream(`sessionId=${sessionId}`);
    await readEvent(250);

    expect(getSessionJobs(sessionId)?.has(staleJobId)).toBe(false);

    close();
  });

  it("streams progress and completed events for a running job", async () => {
    const initial = await openStream();
    const sessionCookie = (initial.headers["set-cookie"] as string[])[0].split(";")[0];
    initial.close();

    const { jobId } = await submitRealJob(sessionCookie);
    const { readEvent, close } = await openStream(sessionCookie);

    // skip the pending snapshot
    await readEvent();

    const events: Record<string, unknown>[] = [];
    for (let i = 0; i < 10; i++) {
      const event = await readEvent(10_000);
      if (!event) break;
      events.push(event);
      if (event.status === "completed") break;
    }

    const progressEvents = events.filter((e) => e.status === "processing");
    const completedEvent = events.find((e) => e.status === "completed");

    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents[0]).toMatchObject({ jobId, status: "processing" });
    expect(completedEvent).toMatchObject({ jobId, status: "completed" });
    expect(typeof completedEvent?.outputFilename).toBe("string");

    close();
  }, 30_000);
});
