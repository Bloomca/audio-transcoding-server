import { createState } from "veles";

type JobStatus =
  | { status: "pending" }
  | { status: "processing"; progress: number }
  | { status: "completed"; outputFilename: string }
  | { status: "failed"; error: string };

const jobStatus$ = createState<Map<string, JobStatus>>(new Map());

export { jobStatus$ };
export type { JobStatus };
