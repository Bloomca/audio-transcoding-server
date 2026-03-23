import { createRef, onMount } from "veles";
import type { SelectedFile } from "./SelectedFileRow";

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
      label: file.webkitRelativePath,
    }));
    onPickFolders?.(files, directoryName);
    input.value = "";
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Upload</h2>
        <p>You can upload either tracks or entire folders. To convert an entire album and to preserve extra files like artwork, include it in the uploaded files and download the result as a zip file.</p>
      </div>

      <div className="mode-row">
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
