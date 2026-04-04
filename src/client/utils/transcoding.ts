import { jobStatus$ } from "../jobStatusStore";

import type { SelectedFile } from "../components/SelectedFileRow";

export class TranscodeRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly retryAfterSecs?: number,
  ) {
    super(message);
    this.name = "TranscodeRequestError";
  }
}

function parseRetryAfterSeconds(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;

  const seconds = Number.parseInt(headerValue, 10);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds;
  }

  const retryAtMs = Date.parse(headerValue);
  if (Number.isNaN(retryAtMs)) {
    return undefined;
  }

  const remainingSecs = Math.ceil((retryAtMs - Date.now()) / 1000);
  return remainingSecs > 0 ? remainingSecs : undefined;
}

export function canTranscodeFile(file: SelectedFile): boolean {
  if (file.kind !== "audio") return false;

  const entry = jobStatus$.get().get(file.id);
  if (!entry) return true;

  return entry.status === "failed";
}

export async function transcode(
  file: File,
  format: string,
  onUploadProgress?: (progress: number) => void,
) {
  const form = new FormData();
  form.append("file", file);
  form.append("outputFormat", format);

  // due to potentially big file uploads, we need to track the
  // progress, and it is possible only while using XHR
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/transcode");

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total === 0) return;
      const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onUploadProgress?.(progress);
    };

    request.onload = () => {
      let body: { id?: string; error?: string } = {};

      try {
        body = request.responseText
          ? (JSON.parse(request.responseText) as {
              id?: string;
              error?: string;
            })
          : {};
      } catch {
        reject(new Error("Invalid server response"));
        return;
      }

      if (request.status >= 200 && request.status < 300 && body.id) {
        onUploadProgress?.(100);
        resolve(body.id);
        return;
      }

      reject(
        new TranscodeRequestError(
          body.error ?? "Failed to submit transcode request",
          request.status,
          parseRetryAfterSeconds(request.getResponseHeader("Retry-After")),
        ),
      );
    };

    request.onerror = () => reject(new Error("Network error"));
    request.onabort = () => reject(new Error("Request aborted"));

    request.send(form);
  });
}
