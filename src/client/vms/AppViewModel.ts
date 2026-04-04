import { createState } from "veles";
import type { SelectedFile } from "../components/SelectedFileRow";
import { jobStatus$ } from "../jobStatusStore";
import { downloadZip } from "../utils/createZip";
import { openSSE } from "../utils/sseStream";
import {
  canTranscodeFile,
  TranscodeRequestError,
  transcode,
} from "../utils/transcoding";

function mergeFilesById(
  prev: SelectedFile[],
  next: SelectedFile[],
): SelectedFile[] {
  const merged = new Map(prev.map((file) => [file.id, file]));
  for (const file of next) {
    merged.set(file.id, file);
  }
  return Array.from(merged.values());
}

export function createAppVM() {
  const selectedFiles$ = createState<SelectedFile[]>([]);
  const directoryName$ = createState<string | null>(null);
  const isZipping$ = createState(false);
  const retryAfterSecs$ = createState<number | null>(null);

  let retryCountdownInterval: ReturnType<typeof setInterval> | null = null;

  function startRetryCountdown(durationSecs: number) {
    const clamped = Math.max(1, Math.ceil(durationSecs));

    if (retryCountdownInterval) {
      clearInterval(retryCountdownInterval);
      retryCountdownInterval = null;
    }

    retryAfterSecs$.set(clamped);

    retryCountdownInterval = setInterval(() => {
      const current = retryAfterSecs$.get();
      if (current === null) {
        clearInterval(retryCountdownInterval!);
        retryCountdownInterval = null;
        return;
      }

      if (current <= 1) {
        retryAfterSecs$.set(null);
        clearInterval(retryCountdownInterval!);
        retryCountdownInterval = null;
        return;
      }

      retryAfterSecs$.set(current - 1);
    }, 1000);
  }

  function handlePickTracks(files: SelectedFile[]) {
    selectedFiles$.update((prev) => mergeFilesById(prev, files));
  }

  function handlePickFolders(files: SelectedFile[], directoryName: string) {
    directoryName$.set(directoryName);
    selectedFiles$.update((prev) => mergeFilesById(prev, files));
  }

  function handleRemoveFile(file: SelectedFile) {
    selectedFiles$.update((prev) => prev.filter((f) => f.id !== file.id));
  }

  async function handleTranscodeFile(file: SelectedFile, format: string) {
    if (!canTranscodeFile(file)) return;

    jobStatus$.update((prev) => {
      const next = new Map(prev);
      next.set(file.id, { status: "uploading", progress: 0 });
      return next;
    });

    try {
      const jobId = await transcode(file.file, format, (progress) => {
        jobStatus$.update((prev) => {
          const next = new Map(prev);
          next.set(file.id, { status: "uploading", progress });
          return next;
        });
      });
      jobStatus$.update((prev) => {
        const next = new Map(prev);
        next.set(file.id, { status: "pending", jobId });
        return next;
      });
      openSSE();
    } catch (error) {
      if (
        error instanceof TranscodeRequestError &&
        (error.statusCode === 429 || error.statusCode === 503)
      ) {
        startRetryCountdown(error.retryAfterSecs ?? 60);
      }

      const message = error instanceof Error ? error.message : "Upload failed";
      jobStatus$.update((prev) => {
        const next = new Map(prev);
        next.set(file.id, { status: "failed", error: message });
        return next;
      });
    }
  }

  async function handleDownloadAll(format: string) {
    isZipping$.set(true);
    try {
      await downloadZip(
        selectedFiles$.get(),
        jobStatus$.get(),
        directoryName$.get(),
        format,
      );
    } finally {
      isZipping$.set(false);
    }
  }

  async function handleTranscodeAll(format: string) {
    const files = selectedFiles$.get();
    for (const file of files) {
      await handleTranscodeFile(file, format);
    }
  }

  return {
    handlePickTracks,
    handlePickFolders,
    handleRemoveFile,
    handleTranscodeAll,
    handleTranscodeFile,
    handleDownloadAll,
    selectedFiles$,
    isZipping$,
    retryAfterSecs$,
  };
}
