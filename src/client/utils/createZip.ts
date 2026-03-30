import { zip } from "fflate";
import type { SelectedFile } from "../components/SelectedFileRow";
import type { JobStatus } from "../jobStatusStore";

async function fetchAudioEntry(
  outputFilename: string,
  jobId: string,
): Promise<{ name: string; data: Uint8Array }> {
  const response = await fetch(`/download/${outputFilename}?id=${jobId}`);
  const disposition = response.headers.get("Content-Disposition");
  const rfc5987 = disposition?.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  const name = rfc5987
    ? decodeURIComponent(rfc5987)
    : (disposition?.match(/filename="([^"]+)"/)?.[1] ?? outputFilename);
  return { name, data: new Uint8Array(await response.arrayBuffer()) };
}

async function downloadZip(
  files: SelectedFile[],
  statusMap: Map<string, JobStatus>,
  directoryName: string | null,
): Promise<void> {
  const entries: Array<{ name: string; data: Uint8Array }> = [];

  for (const file of files) {
    if (file.kind === "audio" && file.jobId) {
      const status = statusMap.get(file.jobId);
      if (status?.status === "completed") {
        entries.push(await fetchAudioEntry(status.outputFilename, file.jobId));
      }
    } else if (file.kind === "extra") {
      entries.push({
        name: file.label,
        data: new Uint8Array(await file.file.arrayBuffer()),
      });
    }
  }

  const zipInput: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const { name, data } of entries) {
    zipInput[name] = [data, { level: 0 }];
  }

  return new Promise((resolve, reject) => {
    zip(zipInput, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      const url = URL.createObjectURL(
        new Blob([data.buffer as ArrayBuffer], { type: "application/zip" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = directoryName ? `${directoryName}.zip` : "transcoded.zip";
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    });
  });
}

export { downloadZip };
