import { createRef, type State } from "veles";
import { SelectedFileRow, type SelectedFile } from "./SelectedFileRow";

type SelectedFilesListProps = {
  filesState: State<SelectedFile[]>;
  onDownloadFile?: (file: SelectedFile) => void;
  onDownloadAll?: () => void;
  onTranscodeFile?: (file: SelectedFile, format: string) => void;
  onTranscodeAll?: (format: string) => void;
  onRemoveFile?: (file: SelectedFile) => void;
};

function SelectedFilesList({
  filesState,
  onDownloadFile,
  onDownloadAll,
  onTranscodeFile,
  onTranscodeAll,
  onRemoveFile,
}: SelectedFilesListProps) {
  const formatRef = createRef<HTMLSelectElement>();

  return (
    <section className="panel selection" aria-live="polite">
      <div className="selection-header">
        <h2>Selected files</h2>
        <div className="selection-actions">
          <label>
            Format
            <select ref={formatRef} defaultValue="mp3">
              <option value="mp3">MP3</option>
              <option value="ogg">OGG</option>
            </select>
          </label>
          <button
            type="button"
            disabled={filesState.useAttribute((files) => files.filter((f) => f.kind === "audio").length === 0)}
            onClick={() => onTranscodeAll?.(formatRef.current?.value ?? "mp3")}
          >
            Transcode all
          </button>
          <button
            type="button"
            disabled={filesState.useAttribute((files) => files.length === 0)}
            onClick={onDownloadAll}
          >
            Download ZIP
          </button>
        </div>
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
                <SelectedFileRow
                  file={file}
                  onDownload={onDownloadFile}
                  onTranscode={(f) => onTranscodeFile?.(f, formatRef.current?.value ?? "mp3")}
                  onRemove={onRemoveFile}
                />
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
                <SelectedFileRow file={file} onRemove={onRemoveFile} />
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

export { SelectedFilesList };
