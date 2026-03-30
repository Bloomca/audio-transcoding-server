import { jobStatus$ } from "../jobStatusStore";

import type { SelectedFile } from "../components/SelectedFileRow";

export function canTranscodeFile(file: SelectedFile): boolean {
  if (file.kind !== "audio") return false;
  // if there is no jobId attached, it means we haven't transcoded it yet
  if (!file.jobId) return true;

  const entry = jobStatus$.get().get(file.jobId);

  // allow to refetch on error
  if (entry?.status === "failed") return true;

  return false;
}

export async function transcode(file: File, format: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("outputFormat", format);
  const response = await fetch("/transcode", { method: "POST", body: form });
  const { id: jobId } = (await response.json()) as { id: string };

  return jobId;
}
