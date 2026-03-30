import { createState } from "veles";
import { FilePicker } from "./components/FilePicker";
import { SelectedFilesList } from "./components/SelectedFilesList";
import type { SelectedFile } from "./components/SelectedFileRow";
import { openSSE } from "./utils/sseStream";
import { jobStatus$ } from "./jobStatusStore";
import { downloadZip } from "./utils/createZip";
import { canTranscodeFile, transcode } from "./utils/transcoding";

function App() {
  const selectedFiles$ = createState<SelectedFile[]>([]);
  const directoryName$ = createState<string | null>(null);
  const isZipping$ = createState(false);

  function handlePickTracks(files: SelectedFile[]) {
    selectedFiles$.update((prev) => [...prev, ...files]);
  }

  function handlePickFolders(files: SelectedFile[], directoryName: string) {
    directoryName$.set(directoryName);
    selectedFiles$.update((prev) => [...prev, ...files]);
  }

  function handleRemoveFile(file: SelectedFile) {
    selectedFiles$.update((prev) => prev.filter((f) => f.id !== file.id));
  }

  async function handleTranscodeFile(file: SelectedFile, format: string) {
    if (!canTranscodeFile(file)) return;
    const jobId = await transcode(file.file, format);
    selectedFiles$.update((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, jobId } : f)),
    );
    openSSE();
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

  return (
    <main class="shell">
      <section class="hero">
        <p class="eyebrow"></p>
        <h1>Audio Transcoding Server</h1>
        <p class="lede">
          Upload tracks in any common format and transcode to some other format.
        </p>
      </section>

      <FilePicker
        onPickTracks={handlePickTracks}
        onPickFolders={handlePickFolders}
      />
      <SelectedFilesList
        files$={selectedFiles$}
        isZipping$={isZipping$}
        onRemoveFile={handleRemoveFile}
        onTranscodeFile={handleTranscodeFile}
        onTranscodeAll={handleTranscodeAll}
        onDownloadAll={handleDownloadAll}
      />
    </main>
  );
}

export { App };
