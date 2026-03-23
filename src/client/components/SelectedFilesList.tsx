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
            disabled={filesState.useAttribute((files) => !files.some((f) => f.kind === "audio"))}
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
        {filesState.useValueSelector(
          (files) => files.length,
          (count) => {
            if (count === 0) return "No files selected yet.";
            return `${count} file${count === 1 ? "" : "s"} selected.`;
          }
        )}
      </p>

      <div
        className="file-group"
        hidden={filesState.useAttribute((files) => !files.some((f) => f.kind === "audio"))}
      >
        <h3>Tracks</h3>
        <ul className="selection-list">
          {filesState.useValueIterator<SelectedFile>(
            { key: ({ element }) => element.label },
            ({ elementState }) => {
              if (elementState.getValue().kind !== "audio") return <div />;
              return (
                <SelectedFileRow
                  fileState={elementState}
                  onDownload={onDownloadFile}
                  onTranscode={(f) => onTranscodeFile?.(f, formatRef.current?.value ?? "mp3")}
                  onRemove={onRemoveFile}
                />
              );
            }
          )}
        </ul>
      </div>

      <div
        className="file-group"
        hidden={filesState.useAttribute((files) => !files.some((f) => f.kind === "extra"))}
      >
        <h3>Extra files</h3>
        <ul className="selection-list">
          {filesState.useValueIterator<SelectedFile>(
            { key: ({ element }) => element.label },
            ({ elementState }) => {
              if (elementState.getValue().kind !== "extra") return <div />;
              return <SelectedFileRow fileState={elementState} onRemove={onRemoveFile} />;
            }
          )}
        </ul>
      </div>
    </section>
  );
}

export { SelectedFilesList };
