import { jobStatusState, type JobStatus } from "./jobStatusStore";

type SSEEvent =
  | { jobId: string; status: "pending" }
  | { jobId: string; status: "processing"; progress: number }
  | { jobId: string; status: "completed"; outputFilename: string }
  | { jobId: string; status: "failed"; error: string };

let eventSource: EventSource | null = null;

function openSSE() {
  if (eventSource) return;
  eventSource = new EventSource("/status/stream");
  eventSource.onmessage = (event: MessageEvent<string>) => {
    const data = JSON.parse(event.data) as SSEEvent;
    jobStatusState.setValue((prev) => {
      const next = new Map(prev);
      const { jobId, ...rest } = data;
      next.set(jobId, rest as JobStatus);
      return next;
    });
  };
}

export { openSSE };
