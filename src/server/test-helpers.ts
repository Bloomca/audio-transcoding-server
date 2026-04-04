import FormData from "form-data";
import { afterAll, afterEach, beforeAll } from "vitest";
import { createTranscodeQueue } from "../shared/queue.js";
import { buildApp } from "./app.js";

export function useQueue() {
  const queue = createTranscodeQueue();

  beforeAll(async () => await queue.obliterate({ force: true }));
  afterEach(async () => await queue.obliterate({ force: true }));
  afterAll(async () => await queue.close());

  return queue;
}

export function buildForm(
  options: { file?: boolean; outputFormat?: string } = {},
) {
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

export async function submitTranscodeRequest(
  options: { outputFormat?: string } = {},
) {
  const app = buildApp();
  const form = buildForm({ outputFormat: options.outputFormat ?? "mp3" });

  const response = await app.inject({
    method: "POST",
    url: "/transcode",
    payload: form,
    headers: form.getHeaders(),
  });

  return { app, response, id: response.json().id as string };
}
