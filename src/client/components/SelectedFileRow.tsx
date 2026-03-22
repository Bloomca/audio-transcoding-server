type SelectedFile = {
  id: string;
  label: string;
};

type SelectedFileRowProps = {
  file: SelectedFile;
  onDownload?: (file: SelectedFile) => void;
};

function SelectedFileRow({ file, onDownload }: SelectedFileRowProps) {
  return (
    <li>
      <span>{file.label}</span>
      <button type="button" onClick={() => onDownload?.(file)}>
        Download
      </button>
    </li>
  );
}

export { SelectedFileRow };
export type { SelectedFile };
