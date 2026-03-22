import type { OutputFormat } from "./formats.js";

export interface TranscodeJobData {
  jobId: string;
  savedFilename: string;
  originalFilename: string;
  outputFormat: OutputFormat;
}

export interface TranscodeJobResult {
  outputFilename: string;
}
