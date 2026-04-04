import { createState } from "veles";
import type { FileId } from "./utils/fileId";

type JobStatus =
  | { status: "uploading"; progress: number }
  | { status: "pending"; jobId: string }
  | { status: "processing"; jobId: string; progress: number }
  | { status: "completed"; jobId: string; outputFilename: string }
  | { status: "failed"; error: string; jobId?: string };

const jobStatus$ = createState<Map<FileId, JobStatus>>(new Map());

export type { JobStatus };
export { jobStatus$ };
