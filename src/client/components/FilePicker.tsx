import { createRef, onMount } from "veles";
import type { SelectedFile } from "./SelectedFileRow";
import { createFilePickerVM } from '../vms/FilePickerViewModel'

type FilePickerProps = {
  onPickTracks?: (files: SelectedFile[]) => void;
  onPickFolders?: (files: SelectedFile[], directoryName: string) => void;
};

function FilePicker({ onPickTracks, onPickFolders }: FilePickerProps) {
  const trackInputRef = createRef<HTMLInputElement>();
  const folderInputRef = createRef<HTMLInputElement>();

  onMount(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
  });

  const vm = createFilePickerVM(onPickTracks, onPickFolders)

  return (
    <section class="panel">
      <div class="panel-header">
        <h2>Upload</h2>
        <p>
          You can upload either tracks or an entire folder. To convert an entire
          album and to preserve extra files like the artwork, include it in the
          uploaded files and download the result as a zip file.
        </p>
      </div>

      <div class="buttons">
        <button type="button" onClick={() => trackInputRef.current?.click()}>
          Select tracks
        </button>
        <button type="button" onClick={() => folderInputRef.current?.click()}>
          Select folders
        </button>
      </div>

      <input
        ref={trackInputRef}
        type="file"
        multiple={true}
        style="display: none"
        onChange={vm.handleTrackChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        style="display: none"
        onChange={vm.handleFolderChange}
      />
    </section>
  );
}

export { FilePicker };
