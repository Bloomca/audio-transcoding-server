export const FORMAT_CONFIG = {
  mp3: {
    extension: "mp3",
    label: "MP3",
  },
  ogg: {
    extension: "ogg",
    label: "OGG (Vorbis)",
  },
  m4a: {
    extension: "m4a",
    label: "M4A (AAC)",
  },
  opus: {
    extension: "opus",
    label: "Opus",
  },
  alac: {
    extension: "m4a",
    label: "ALAC (M4A)",
  },
  flac: {
    extension: "flac",
    label: "FLAC",
  },
} as const;

export type OutputFormat = keyof typeof FORMAT_CONFIG;

export const SUPPORTED_FORMATS = Object.keys(FORMAT_CONFIG) as OutputFormat[];

export function isSupportedFormat(format: string): format is OutputFormat {
  return Object.hasOwn(FORMAT_CONFIG, format);
}

export const FORMAT_EXTENSIONS: Record<OutputFormat, string> =
  Object.fromEntries(
    Object.entries(FORMAT_CONFIG).map(([format, config]) => [format, config.extension]),
  ) as Record<OutputFormat, string>;
