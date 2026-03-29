import { createRef, type State } from "veles";
import { SelectedFileRow, type SelectedFile } from "./SelectedFileRow";

type SelectedFilesListProps = {
  filesState: State<SelectedFile[]>;
  isZippingState: State<boolean>;
  onDownloadAll?: () => void;
  onTranscodeFile?: (file: SelectedFile, format: string) => void;
  onTranscodeAll?: (format: string) => void;
  onRemoveFile?: (file: SelectedFile) => void;
};

function SelectedFilesList({
  filesState,
  isZippingState,
  onDownloadAll,
  onTranscodeFile,
  onTranscodeAll,
  onRemoveFile,
}: SelectedFilesListProps) {
  const formatRef = createRef<HTMLSelectElement>();

  const audioFilesState = filesState.map((files) =>
    files.filter((file) => file.kind === "audio")
  );
  const extraFilesState = filesState.map((files) =>
    files.filter((file) => file.kind === "extra")
  );

  return (
    <section class="panel selection" aria-live="polite">
      <div class="selection-header">
        <h2>Selected files</h2>
        <div class="selection-actions">
          <label>
            Format
            <select ref={formatRef} value="mp3">
              <option value="mp3">MP3</option>
              <option value="ogg">OGG</option>
            </select>
          </label>
          <button
            type="button"
            disabled={audioFilesState.attribute((files) => files.length === 0)}
            onClick={() => onTranscodeAll?.(formatRef.current?.value ?? "mp3")}
          >
            Transcode all
          </button>
          <button
            type="button"
            disabled={filesState
              .combine(isZippingState)
              .attribute(([files, isZipping]) => files.length === 0 || isZipping)}
            onClick={onDownloadAll}
          >
            Download ZIP
          </button>
        </div>
      </div>

      <p class="selection-summary">
        {filesState.renderSelected(
          (files) => files.length,
          (count) => {
            if (count === 0) return "No files selected yet.";
            return `${count} file${count === 1 ? "" : "s"} selected.`;
          }
        )}
      </p>

      <div
        class="file-group"
        hidden={audioFilesState.attribute((files) => files.length === 0)}
      >
        <h3>Tracks</h3>
        <ul class="selection-list">
          {audioFilesState.renderEach({ key: "id" }, ({ elementState }) => {
            return (
              <SelectedFileRow
                fileState={elementState}
                onTranscode={(f) => onTranscodeFile?.(f, formatRef.current?.value ?? "mp3")}
                onRemove={onRemoveFile}
              />
            );
          })}
        </ul>
      </div>

      <div
        class="file-group"
        hidden={extraFilesState.attribute((files) => files.length === 0)}
      >
        <h3>Extra files</h3>
        <ul class="selection-list">
          {extraFilesState.renderEach({ key: "id" }, ({ elementState }) => {
            return <SelectedFileRow fileState={elementState} onRemove={onRemoveFile} />;
          })}
        </ul>
      </div>
    </section>
  );
}

export { SelectedFilesList };
