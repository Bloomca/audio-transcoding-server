type SelectedFile = {
  id: string;
  label: string;
  kind: "audio" | "extra";
};

type SelectedFileRowProps = {
  file: SelectedFile;
  onDownload?: (file: SelectedFile) => void;
  onTranscode?: (file: SelectedFile) => void;
  onRemove?: (file: SelectedFile) => void;
};

function SelectedFileRow({ file, onDownload, onTranscode, onRemove }: SelectedFileRowProps) {
  return (
    <li>
      <span>{file.label}</span>
      {file.kind === "audio" && (
        <button type="button" onClick={() => onTranscode?.(file)}>
          Transcode
        </button>
      )}
      {file.kind === "audio" && (
        <button type="button" onClick={() => onDownload?.(file)}>
          Download
        </button>
      )}
      <button type="button" onClick={() => onRemove?.(file)}>
        Remove
      </button>
    </li>
  );
}

export { SelectedFileRow };
export type { SelectedFile };
