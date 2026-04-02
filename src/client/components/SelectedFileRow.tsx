import { jobStatus$ } from "../jobStatusStore";
import { ErrorMessage } from "./ErrorMessage";

import type { State } from "veles";
import type { FileId } from "../utils/fileId";

type SelectedFile = {
  id: FileId;
  label: string;
  kind: "audio" | "extra";
  file: File;
};

type SelectedFileRowProps = {
  file$: State<SelectedFile>;
  onTranscode?: (file: SelectedFile) => void;
  onRemove?: (file: SelectedFile) => void;
};

function SelectedFileRow({
  file$,
  onTranscode,
  onRemove,
}: SelectedFileRowProps) {
  // kind and label never change after creation — read once
  const { kind, label } = file$.get();

  const fileAndStatus$ = file$.combine(jobStatus$);

  const downloadUrl$ = fileAndStatus$.map(([file, statusMap]) => {
    const entry = statusMap.get(file.id);
    if (entry?.status !== "completed") return null;
    return `/download/${entry.outputFilename}?id=${entry.jobId}`;
  });

  const progress$ = fileAndStatus$.map(([file, statusMap]) => {
    const entry = statusMap.get(file.id);
    if (!entry) return null;
    if (entry.status === "uploading") return entry.progress;
    if (entry.status === "processing") return entry.progress;
    return null;
  });

  const error$ = fileAndStatus$.map(([file, statusMap]) => {
    const entry = statusMap.get(file.id);
    return entry?.status === "failed" ? entry.error : null;
  });

  const transcodeDisabled$ = fileAndStatus$.map(([file, statusMap]) => {
    if (file.kind !== "audio") return true;
    const entry = statusMap.get(file.id);
    if (!entry) return false;
    return entry.status !== "failed";
  });

  function handleTranscode() {
    onTranscode?.(file$.get());
  }

  return (
    <li class="track-row-container">
      <div class="track-row">
        <span>{label}</span>

        <div class="track-actions">
          {kind === "audio" && (
            <progress
              hidden={progress$.attribute((p) => p === null)}
              value={progress$.attribute((p) => p ?? 0)}
              max={100}
            />
          )}

          <ErrorMessage error$={error$} onRetry={handleTranscode} />

          {kind === "audio" && (
            <button
              type="button"
              disabled={transcodeDisabled$.attribute()}
              onClick={handleTranscode}
            >
              Transcode
            </button>
          )}
          {kind === "audio" && (
            <a
              href={downloadUrl$.attribute((url) => url ?? "")}
              hidden={downloadUrl$.attribute((url) => url === null)}
              download
            >
              Download
            </a>
          )}
          <button type="button" onClick={() => onRemove?.(file$.get())}>
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

export { SelectedFileRow };
export type { SelectedFile };
