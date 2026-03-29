import { createState } from "veles";
import { FilePicker } from "./components/FilePicker";
import { SelectedFilesList } from "./components/SelectedFilesList";
import type { SelectedFile } from "./components/SelectedFileRow";
import { openSSE } from "./sseStream";
import { jobStatusState } from "./jobStatusStore";
import { downloadZip } from "./createZip";

function App() {
  const selectedFilesState = createState<SelectedFile[]>([]);
  const directoryNameState = createState<string | null>(null);
  const isZippingState = createState(false);

  function handlePickTracks(files: SelectedFile[]) {
    selectedFilesState.update((prev) => [...prev, ...files]);
  }

  function handlePickFolders(files: SelectedFile[], directoryName: string) {
    directoryNameState.set(directoryName);
    selectedFilesState.update((prev) => [...prev, ...files]);
  }

  function handleRemoveFile(file: SelectedFile) {
    selectedFilesState.update((prev) => prev.filter((f) => f.id !== file.id));
  }

  async function handleTranscodeFile(file: SelectedFile, format: string) {
    if (file.kind !== "audio" || file.jobId) return;
    const form = new FormData();
    form.append("file", file.file);
    form.append("outputFormat", format);
    const response = await fetch("/transcode", { method: "POST", body: form });
    const { id: jobId } = (await response.json()) as { id: string };
    selectedFilesState.update((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, jobId } : f))
    );
    openSSE();
  }

  async function handleDownloadAll() {
    isZippingState.set(true);
    try {
      await downloadZip(
        selectedFilesState.get(),
        jobStatusState.get(),
        directoryNameState.get()
      );
    } finally {
      isZippingState.set(false);
    }
  }

  async function handleTranscodeAll(format: string) {
    const files = selectedFilesState.get();
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

      <FilePicker onPickTracks={handlePickTracks} onPickFolders={handlePickFolders} />
      <SelectedFilesList
        filesState={selectedFilesState}
        isZippingState={isZippingState}
        onRemoveFile={handleRemoveFile}
        onTranscodeFile={handleTranscodeFile}
        onTranscodeAll={handleTranscodeAll}
        onDownloadAll={handleDownloadAll}
      />
    </main>
  );
}

export { App };
