import type { State } from "veles";
import { SelectedFileRow, type SelectedFile } from "./SelectedFileRow";

type SelectedFilesListProps = {
  filesState: State<SelectedFile[]>;
  onDownloadFile?: (file: SelectedFile) => void;
  onDownloadAll?: () => void;
};

function SelectedFilesList({
  filesState,
  onDownloadFile,
  onDownloadAll,
}: SelectedFilesListProps) {
  return (
    <section className="panel selection" aria-live="polite">
      <div className="selection-header">
        <h2>Selected files</h2>
        <button
          type="button"
          disabled={filesState.useAttribute((files) => files.length === 0)}
          onClick={onDownloadAll}
        >
          Download ZIP
        </button>
      </div>

      <p className="selection-summary">
        {filesState.useValueSelector((files) => files.length, (count) => {
          if (count === 0) {
            return "No files selected yet.";
          }

          return `${count} file${count === 1 ? "" : "s"} selected.`;
        })}
      </p>

      {filesState.useValue((files) => {
        const audioFiles = files.filter((f) => f.kind === "audio");
        if (audioFiles.length === 0) return null;
        return (
          <div className="file-group">
            <h3>Tracks</h3>
            <ul className="selection-list">
              {audioFiles.map((file) => (
                <SelectedFileRow file={file} onDownload={onDownloadFile} />
              ))}
            </ul>
          </div>
        );
      })}

      {filesState.useValue((files) => {
        const extraFiles = files.filter((f) => f.kind === "extra");
        if (extraFiles.length === 0) return null;
        return (
          <div className="file-group">
            <h3>Extra files</h3>
            <ul className="selection-list">
              {extraFiles.map((file) => (
                <SelectedFileRow file={file} />
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

export { SelectedFilesList };
