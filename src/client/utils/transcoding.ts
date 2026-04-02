import { jobStatus$ } from "../jobStatusStore";

import type { SelectedFile } from "../components/SelectedFileRow";

export function canTranscodeFile(file: SelectedFile): boolean {
  if (file.kind !== "audio") return false;

  const entry = jobStatus$.get().get(file.id);
  if (!entry) return true;

  return entry.status === "failed";
}

export async function transcode(file: File, format: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("outputFormat", format);

  const response = await fetch("/transcode", { method: "POST", body: form });
  const body = (await response.json()) as { id?: string; error?: string };

  if (!response.ok || !body.id) {
    throw new Error(body.error ?? "Failed to submit transcode request");
  }

  return body.id;
}
