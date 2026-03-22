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

      <ul className="selection-list">
        {filesState.useValueIterator(
          { key: ({ element }) => element.id },
          ({ elementState }) =>
            elementState.useValue((file) => (
              <SelectedFileRow file={file} onDownload={onDownloadFile} />
            ))
        )}
      </ul>
    </section>
  );
}

export { SelectedFilesList };
