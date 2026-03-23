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
      <SelectedFilesList filesState={selectedFilesState} />
    </main>
  );
}

export { App };
