import { createState } from "veles";
import type { SelectedFile } from "../components/SelectedFileRow";
import { openSSE } from "../utils/sseStream";
import { jobStatus$ } from "../jobStatusStore";
import { downloadZip } from "../utils/createZip";
import { canTranscodeFile, transcode } from "../utils/transcoding";

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
      const jobId = await transcode(file.file, format);
      jobStatus$.update((prev) => {
        const next = new Map(prev);
        next.set(file.id, { status: "pending", jobId });
        return next;
      });
      openSSE();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      jobStatus$.update((prev) => {
        const next = new Map(prev);
        next.set(file.id, { status: "failed", error: message });
        return next;
      });
    }
  }

  async function handleDownloadAll() {
    isZipping$.set(true);
    try {
      await downloadZip(
        selectedFiles$.get(),
        jobStatus$.get(),
        directoryName$.get(),
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
  };
}
