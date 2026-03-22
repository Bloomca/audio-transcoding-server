import { createState } from "veles";
import { FilePicker } from "./components/FilePicker";
import { SelectedFilesList } from "./components/SelectedFilesList";
import type { SelectedFile } from "./components/SelectedFileRow";

function App() {
  const selectedFilesState = createState<SelectedFile[]>([]);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Audio Transcoding Server</p>
        <h1>Convert albums or individual tracks without handing the flow to another service.</h1>
        <p className="lede">
          Start with the picker, then render selected tracks as individually downloadable items with
          a ZIP action for the full batch.
        </p>
      </section>

      <FilePicker />
      <SelectedFilesList filesState={selectedFilesState} />
    </main>
  );
}

export { App };
