import { createRef, onMount } from "veles";
import type { SelectedFile } from "./SelectedFileRow";

const AUDIO_EXTENSIONS = new Set([
  "flac", "mp3", "ogg", "wav", "aac", "m4a", "aiff", "aif", "opus", "wma", "ape",
]);

function getFileKind(filename: string): SelectedFile["kind"] {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_EXTENSIONS.has(ext) ? "audio" : "extra";
}

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

  function handleTrackChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const files: SelectedFile[] = Array.from(input.files).map((file) => ({
      id: crypto.randomUUID(),
      label: file.name,
      kind: getFileKind(file.name),
      file,
    }));
    onPickTracks?.(files);
    input.value = "";
  }

  function handleFolderChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const directoryName = input.files[0].webkitRelativePath.split("/")[0];
    const files: SelectedFile[] = Array.from(input.files).map((file) => ({
      id: crypto.randomUUID(),
      label: file.webkitRelativePath.slice(directoryName.length + 1),
      kind: getFileKind(file.name),
      file,
    }));
    onPickFolders?.(files, directoryName);
    input.value = "";
  }

  return (
    <section class="panel">
      <div class="panel-header">
        <h2>Upload</h2>
        <p>You can upload either tracks or entire folders. To convert an entire album and to preserve extra files like artwork, include it in the uploaded files and download the result as a zip file.</p>
      </div>

      <div class="mode-row">
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
        onChange={handleTrackChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        style="display: none"
        onChange={handleFolderChange}
      />
    </section>
  );
}

export { FilePicker };
