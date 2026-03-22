export interface TranscodeJobData {
  jobId: string;
  savedFilename: string;
  originalFilename: string;
  outputFormat: string;
}

export interface TranscodeJobResult {
  outputFilename: string;
}
