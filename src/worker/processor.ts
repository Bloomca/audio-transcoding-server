import { unlink } from "node:fs/promises";
import path from "node:path";
import type { Job } from "bullmq";
import { config } from "../shared/config.js";
import { FORMAT_EXTENSIONS } from "../shared/formats.js";
import type { TranscodeJobData, TranscodeJobResult } from "../shared/jobs.js";
import { transcode } from "./ffmpeg.js";

export async function processTranscodeJob(
  job: Job<TranscodeJobData, TranscodeJobResult>,
): Promise<TranscodeJobResult> {
  const { jobId, savedFilename, outputFormat } = job.data;

  const inputPath = path.join(config.storagePath, savedFilename);
  const outputFilename = `${jobId}-output.${FORMAT_EXTENSIONS[outputFormat]}`;
  const outputPath = path.join(config.storagePath, outputFilename);

  await transcode({
    inputPath,
    outputPath,
    outputFormat,
    onProgress: (percent) => job.updateProgress(percent),
  });

  await unlink(inputPath);

  return { outputFilename };
}
