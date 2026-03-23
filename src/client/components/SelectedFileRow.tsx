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
  onDownload?: (file: SelectedFile) => void;
  onTranscode?: (file: SelectedFile) => void;
  onRemove?: (file: SelectedFile) => void;
};

function SelectedFileRow({ fileState, onDownload, onTranscode, onRemove }: SelectedFileRowProps) {
  // kind and label never change after creation — read once
  const { kind, label } = fileState.getValue();

  const downloadEnabled = select(
    combine(fileState, jobStatusState),
    ([file, statusMap]) => !!file.jobId && statusMap.get(file.jobId)?.status === "completed"
  );

  return (
    <li>
      <span>{label}</span>
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
        <button
          type="button"
          disabled={downloadEnabled.useAttribute((enabled) => !enabled)}
          onClick={() => onDownload?.(fileState.getValue())}
        >
          Download
        </button>
      )}
      <button type="button" onClick={() => onRemove?.(fileState.getValue())}>
        Remove
      </button>
    </li>
  );
}

export { SelectedFileRow };
export type { SelectedFile };
