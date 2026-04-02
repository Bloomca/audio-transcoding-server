import { jobStatus$, type JobStatus } from "../jobStatusStore";
import type { FileId } from "./fileId";

type SSEEvent =
  | { jobId: string; status: "pending" }
  | { jobId: string; status: "processing"; progress: number }
  | { jobId: string; status: "completed"; outputFilename: string }
  | { jobId: string; status: "failed"; error: string };

function findFileIdByJobId(
  map: Map<FileId, JobStatus>,
  jobId: string,
): FileId | undefined {
  for (const [fileId, status] of map.entries()) {
    if ("jobId" in status && status.jobId === jobId) {
      return fileId;
    }
  }
  return undefined;
}

let eventSource: EventSource | null = null;

function openSSE() {
  if (eventSource) return;
  eventSource = new EventSource("/status/stream");
  eventSource.onmessage = (event: MessageEvent<string>) => {
    const data = JSON.parse(event.data) as SSEEvent;
    jobStatus$.update((prev) => {
      const next = new Map(prev);
      const fileId = findFileIdByJobId(next, data.jobId);
      if (!fileId) return next;

      if (data.status === "pending") {
        next.set(fileId, { status: "pending", jobId: data.jobId });
      } else if (data.status === "processing") {
        next.set(fileId, {
          status: "processing",
          jobId: data.jobId,
          progress: data.progress,
        });
      } else if (data.status === "completed") {
        next.set(fileId, {
          status: "completed",
          jobId: data.jobId,
          outputFilename: data.outputFilename,
        });
      } else {
        next.set(fileId, {
          status: "failed",
          jobId: data.jobId,
          error: data.error,
        });
      }

      return next;
    });
  };
}

export { openSSE };
