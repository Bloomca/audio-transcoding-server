import { createRef, type State } from "veles";
import { FORMAT_CONFIG, type OutputFormat } from "../../shared/formats.js";
import { SelectedFileRow, type SelectedFile } from "./SelectedFileRow";

const DEFAULT_OUTPUT_FORMAT: OutputFormat = "mp3";
const OUTPUT_FORMAT_OPTIONS = Object.entries(FORMAT_CONFIG) as Array<
  [OutputFormat, (typeof FORMAT_CONFIG)[OutputFormat]]
>;

type SelectedFilesListProps = {
  files$: State<SelectedFile[]>;
  isZipping$: State<boolean>;
  onDownloadAll?: (format: string) => void;
  onTranscodeFile?: (file: SelectedFile, format: string) => void;
  onTranscodeAll?: (format: string) => void;
  onRemoveFile?: (file: SelectedFile) => void;
};

function SelectedFilesList({
  files$,
  isZipping$,
  onDownloadAll,
  onTranscodeFile,
  onTranscodeAll,
  onRemoveFile,
}: SelectedFilesListProps) {
  const formatRef = createRef<HTMLSelectElement>();

  const audioFiles$ = files$.map((files) =>
    files.filter((file) => file.kind === "audio"),
  );
  const extraFiles$ = files$.map((files) =>
    files.filter((file) => file.kind === "extra"),
  );

  return (
    <section class="panel selection" aria-live="polite">
      <div class="selection-header">
        <h2>Selected files</h2>
        <div class="buttons">
          <label class="format-label">
            Format{" "}
            <select name="format" ref={formatRef} value={DEFAULT_OUTPUT_FORMAT}>
              {OUTPUT_FORMAT_OPTIONS.map(([value, config]) => (
                <option value={value}>{config.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={audioFiles$.attribute((files) => files.length === 0)}
            onClick={() => onTranscodeAll?.(formatRef.current?.value ?? DEFAULT_OUTPUT_FORMAT)}
          >
            Transcode all
          </button>
          <button
            type="button"
            disabled={files$
              .combine(isZipping$)
              .attribute(
                ([files, isZipping]) => files.length === 0 || isZipping,
              )}
            onClick={() =>
              onDownloadAll?.(formatRef.current?.value ?? DEFAULT_OUTPUT_FORMAT)
            }
          >
            Download ZIP
          </button>
        </div>
      </div>

      <p class="selection-summary">
        {files$.renderSelected(
          (files) => files.length,
          (count) => {
            if (count === 0) return "No files selected yet.";
            return `${count} file${count === 1 ? "" : "s"} selected.`;
          },
        )}
      </p>

      <div
        class="file-group"
        hidden={audioFiles$.attribute((files) => files.length === 0)}
      >
        <h3>Tracks</h3>
        <ul class="selection-list">
          {audioFiles$.renderEach<SelectedFile>(
            { key: "id" },
            ({ elementState: element$ }) => {
              return (
                <SelectedFileRow
                  file$={element$}
                  onTranscode={(f) =>
                    onTranscodeFile?.(f, formatRef.current?.value ?? DEFAULT_OUTPUT_FORMAT)
                  }
                  onRemove={onRemoveFile}
                />
              );
            },
          )}
        </ul>
      </div>

      <div
        class="file-group"
        hidden={extraFiles$.attribute((files) => files.length === 0)}
      >
        <h3>Extra files</h3>
        <ul class="selection-list">
          {extraFiles$.renderEach(
            { key: "id" },
            ({ elementState: element$ }) => {
              return (
                <SelectedFileRow file$={element$} onRemove={onRemoveFile} />
              );
            },
          )}
        </ul>
      </div>
    </section>
  );
}

export { SelectedFilesList };
