import { createState } from "veles";
import { FilePicker } from "./components/FilePicker";
import { SelectedFilesList } from "./components/SelectedFilesList";
import type { SelectedFile } from "./components/SelectedFileRow";

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

  function handleTranscodeFile(_file: SelectedFile, _format: string) {
    // TODO: wire up transcode API call
  }

  function handleTranscodeAll(_format: string) {
    // TODO: wire up transcode API call for all audio files
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
