type SelectedFile = {
  id: string;
  label: string;
  kind: "audio" | "extra";
};

type SelectedFileRowProps = {
  file: SelectedFile;
  onDownload?: (file: SelectedFile) => void;
};

function SelectedFileRow({ file, onDownload }: SelectedFileRowProps) {
  return (
    <li>
      <span>{file.label}</span>
      {file.kind === "audio" && (
        <button type="button" onClick={() => onDownload?.(file)}>
          Download
        </button>
      )}
    </li>
  );
}

export { SelectedFileRow };
export type { SelectedFile };
