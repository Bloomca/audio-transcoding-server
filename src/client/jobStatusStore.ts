import { createState } from "veles";

type JobStatus =
  | { status: "pending" }
  | { status: "processing"; progress: number }
  | { status: "completed"; outputFilename: string }
  | { status: "failed"; error: string };

const jobStatusState = createState<Map<string, JobStatus>>(new Map());

export { jobStatusState };
export type { JobStatus };
