import { createState } from "veles";
import { FilePicker } from "./components/FilePicker";
import { SelectedFilesList } from "./components/SelectedFilesList";
import type { SelectedFile } from "./components/SelectedFileRow";
import { openSSE } from "./sseStream";

function App() {
  const selectedFilesState = createState<SelectedFile[]>([]);
  const directoryNameState = createState<string | null>(null);

  function handlePickTracks(files: SelectedFile[]) {
    selectedFilesState.setValue((prev) => [...prev, ...files]);
  }

  function handlePickFolders(files: SelectedFile[], directoryName: string) {
    directoryNameState.setValue(directoryName);
    selectedFilesState.setValue((prev) => [...prev, ...files]);
  }

  function handleRemoveFile(file: SelectedFile) {
    selectedFilesState.setValue((prev) => prev.filter((f) => f.id !== file.id));
  }

  async function handleTranscodeFile(file: SelectedFile, format: string) {
    if (file.kind !== "audio" || file.jobId) return;
    const form = new FormData();
    form.append("file", file.file);
    form.append("outputFormat", format);
    const response = await fetch("/transcode", { method: "POST", body: form });
    const { id: jobId } = (await response.json()) as { id: string };
    selectedFilesState.setValue((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, jobId } : f))
    );
    openSSE();
  }

  async function handleTranscodeAll(format: string) {
    const files = selectedFilesState.getValue();
    for (const file of files) {
      await handleTranscodeFile(file, format);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow"></p>
        <h1>Audio Transcoding Server</h1>
        <p className="lede">
          Upload tracks in any common format and transcode to some other format.
        </p>
      </section>

      <FilePicker onPickTracks={handlePickTracks} onPickFolders={handlePickFolders} />
      <SelectedFilesList
        filesState={selectedFilesState}
        onRemoveFile={handleRemoveFile}
        onTranscodeFile={handleTranscodeFile}
        onTranscodeAll={handleTranscodeAll}
      />
    </main>
  );
}

export { App };
