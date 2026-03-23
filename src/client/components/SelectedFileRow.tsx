import type { State } from "veles";
import { combine, select } from "veles/utils";
import { jobStatusState } from "../jobStatusStore";

type SelectedFile = {
  id: string;
  label: string;
  kind: "audio" | "extra";
  file: File;
  jobId?: string;
};

type SelectedFileRowProps = {
  fileState: State<SelectedFile>;
  onTranscode?: (file: SelectedFile) => void;
  onRemove?: (file: SelectedFile) => void;
};

function SelectedFileRow({ fileState, onTranscode, onRemove }: SelectedFileRowProps) {
  // kind and label never change after creation — read once
  const { kind, label } = fileState.getValue();

  const downloadUrlState = select(
    combine(fileState, jobStatusState),
    ([file, statusMap]) => {
      if (!file.jobId) return null;
      const entry = statusMap.get(file.jobId);
      if (entry?.status !== "completed") return null;
      return `/download/${entry.outputFilename}?id=${file.jobId}`;
    }
  );

  const progressState = select(
    combine(fileState, jobStatusState),
    ([file, statusMap]) => {
      if (!file.jobId) return null;
      const entry = statusMap.get(file.jobId);
      return entry?.status === "processing" ? entry.progress : null;
    }
  );

  return (
    <li>
      <span>{label}</span>
      {kind === "audio" && (
        <progress
          hidden={progressState.useAttribute((p) => p === null)}
          value={progressState.useAttribute((p) => p ?? 0)}
          max={100}
        />
      )}
      {kind === "audio" && (
        <button
          type="button"
          disabled={fileState.useAttribute((f) => !!f.jobId)}
          onClick={() => onTranscode?.(fileState.getValue())}
        >
          Transcode
        </button>
      )}
      {kind === "audio" && (
        <a
          href={downloadUrlState.useAttribute((url) => url ?? "")}
          hidden={downloadUrlState.useAttribute((url) => url === null)}
          download
        >
          Download
        </a>
      )}
      <button type="button" onClick={() => onRemove?.(fileState.getValue())}>
        Remove
      </button>
    </li>
  );
}

export { SelectedFileRow };
export type { SelectedFile };
