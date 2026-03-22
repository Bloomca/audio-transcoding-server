import { spawn } from "node:child_process";
import type { OutputFormat } from "../shared/formats.js";

const CODEC_ARGS: Record<OutputFormat, string[]> = {
  mp3: ["-codec:a", "libmp3lame", "-q:a", "0"],
  ogg: ["-codec:a", "libvorbis", "-q:a", "10"],
};

export async function probe(inputPath: string): Promise<{ durationSecs: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      inputPath,
    ]);

    let output = "";
    proc.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}`));
        return;
      }
      const data = JSON.parse(output);
      resolve({ durationSecs: parseFloat(data.format.duration) });
    });

    proc.on("error", reject);
  });
}

interface TranscodeOptions {
  inputPath: string;
  outputPath: string;
  outputFormat: OutputFormat;
  onProgress: (percent: number) => void;
}

export async function transcode({
  inputPath,
  outputPath,
  outputFormat,
  onProgress,
}: TranscodeOptions): Promise<void> {
  const { durationSecs } = await probe(inputPath);

  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-i", inputPath,
      ...CODEC_ARGS[outputFormat],
      "-progress", "pipe:1",
      "-nostats",
      outputPath,
    ]);

    let buffer = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const match = line.match(/^out_time_us=(\d+)$/);
        if (match) {
          const outTimeSecs = parseInt(match[1], 10) / 1_000_000;
          const percent = Math.min(100, Math.round((outTimeSecs / durationSecs) * 100));
          onProgress(percent);
        }
      }
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }
      resolve();
    });

    proc.on("error", reject);
  });
}
