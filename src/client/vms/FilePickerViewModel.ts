import { createStableFileId } from "../utils/fileId";
import type { SelectedFile } from "../components/SelectedFileRow";

const AUDIO_EXTENSIONS = new Set([
  "flac",
  "mp3",
  "ogg",
  "wav",
  "aac",
  "m4a",
  "aiff",
  "aif",
  "opus",
  "wma",
  "ape",
]);

function getFileKind(filename: string): SelectedFile["kind"] {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_EXTENSIONS.has(ext) ? "audio" : "extra";
}

export function createFilePickerVM(
  onPickTracks?: (files: SelectedFile[]) => void,
  onPickFolders?: (files: SelectedFile[], directoryName: string) => void,
) {
  async function handleTrackChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = await Promise.all(
      Array.from(input.files).map(async (file) => {
        const label = file.name;
        return {
          id: await createStableFileId(file, label),
          label,
          kind: getFileKind(file.name),
          file,
        } as SelectedFile;
      }),
    );

    onPickTracks?.(files);
    input.value = "";
  }

  async function handleFolderChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const directoryName = input.files[0].webkitRelativePath.split("/")[0];

    const files = await Promise.all(
      Array.from(input.files).map(async (file) => {
        const label = file.webkitRelativePath.slice(directoryName.length + 1);
        return {
          id: await createStableFileId(file, label),
          label,
          kind: getFileKind(file.name),
          file,
        } as SelectedFile;
      }),
    );

    onPickFolders?.(files, directoryName);
    input.value = "";
  }

  return { handleTrackChange, handleFolderChange };
}
