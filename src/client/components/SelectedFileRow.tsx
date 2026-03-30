import { jobStatus$ } from "../jobStatusStore";
import { ErrorMessage } from "./ErrorMessage";

import type { State } from "veles";

type SelectedFile = {
  id: string;
  label: string;
  kind: "audio" | "extra";
  file: File;
  jobId?: string;
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
    if (!file.jobId) return null;
    const entry = statusMap.get(file.jobId);
    if (entry?.status !== "completed") return null;
    return `/download/${entry.outputFilename}?id=${file.jobId}`;
  });

  const progress$ = fileAndStatus$.map(([file, statusMap]) => {
    if (!file.jobId) return null;
    const entry = statusMap.get(file.jobId);
    return entry?.status === "processing" ? entry.progress : null;
  });

  const error$ = fileAndStatus$.map(([file, statusMap]) => {
    if (!file.jobId) return null;
    const entry = statusMap.get(file.jobId);
    return entry?.status === "failed" ? entry.error : null;
  });

  function handleTranscode() {
    onTranscode?.(file$.get());
  }

  return (
    <li>
      <span>{label}</span>
      {kind === "audio" && (
        <progress
          hidden={progress$.attribute((p) => p === null)}
          value={progress$.attribute((p) => p ?? 0)}
          max={100}
        />
      )}
      {kind === "audio" && (
        <button
          type="button"
          disabled={file$.attribute((f) => !!f.jobId)}
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

      <ErrorMessage error$={error$} onRetry={handleTranscode} />
    </li>
  );
}

export { SelectedFileRow };
export type { SelectedFile };
