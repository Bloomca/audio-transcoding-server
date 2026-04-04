import { FilePicker } from "./FilePicker";
import { SelectedFilesList } from "./SelectedFilesList";
import { RetryAfterWarning } from "./RetryAfterWarning";

import { createAppVM } from "../vms/AppViewModel";

function App() {
  const vm = createAppVM();

  return (
    <main class="shell">
      <section class="hero">
        <p class="eyebrow"></p>
        <h1>Audio Transcoding Server</h1>
        <p class="lede">
          Upload tracks in any common format and transcode to some other format.
        </p>
      </section>

      <RetryAfterWarning retryAfterSecs$={vm.retryAfterSecs$} />

      <FilePicker
        onPickTracks={vm.handlePickTracks}
        onPickFolders={vm.handlePickFolders}
      />
      <SelectedFilesList
        files$={vm.selectedFiles$}
        isZipping$={vm.isZipping$}
        onRemoveFile={vm.handleRemoveFile}
        onTranscodeFile={vm.handleTranscodeFile}
        onTranscodeAll={vm.handleTranscodeAll}
        onDownloadAll={vm.handleDownloadAll}
      />
    </main>
  );
}

export { App };
