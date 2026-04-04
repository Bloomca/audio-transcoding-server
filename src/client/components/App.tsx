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
          This is a free service to convert your audio files in pretty much any format to a selection of other formats. The files will be available only to you and will be deleted after about 5 hours.
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
