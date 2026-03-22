export const SUPPORTED_FORMATS = ["mp3", "ogg"] as const;

export type OutputFormat = (typeof SUPPORTED_FORMATS)[number];

export function isSupportedFormat(format: string): format is OutputFormat {
  return SUPPORTED_FORMATS.includes(format as OutputFormat);
}
