// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectedFile } from "../components/SelectedFileRow";
import type { JobStatus } from "../jobStatusStore";
import { asFileId, type FileId } from "./fileId";

const { zipMock } = vi.hoisted(() => ({
  zipMock: vi.fn(),
}));

vi.mock("fflate", () => ({
  zip: zipMock,
}));

import { downloadZip } from "./createZip";

function createSelectedFile(overrides: Partial<SelectedFile> = {}): SelectedFile {
  return {
    id: asFileId("file-1"),
    label: "track.flac",
    kind: "audio",
    file: new File(["audio"], "track.flac", { type: "audio/flac" }),
    ...overrides,
  };
}

describe("client/utils/createZip", () => {
  beforeEach(() => {
    zipMock.mockImplementation(
      (
        _input: unknown,
        callback: (error: Error | null, data: Uint8Array) => void,
      ) => {
        callback(null, new Uint8Array([1, 2, 3]));
      },
    );

    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:test-url"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("downloads a zip with completed tracks and extra files", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([9, 8, 7]).buffer, {
        headers: {
          "Content-Disposition":
            "attachment; filename*=UTF-8''Track%20%C3%A9.mp3",
        },
      }),
    );

    const createElementOriginal = document.createElement.bind(document);
    let createdAnchor: HTMLAnchorElement | null = null;
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = createElementOriginal(tagName);
      if (tagName === "a") {
        createdAnchor = element as HTMLAnchorElement;
      }
      return element;
    });

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    const extraFile = {
      arrayBuffer: vi.fn(async () => new Uint8Array([5, 4]).buffer),
    } as unknown as File;

    const files: SelectedFile[] = [
      createSelectedFile({ id: asFileId("audio-1") }),
      createSelectedFile({
        id: asFileId("audio-2"),
        label: "broken.flac",
        file: new File(["audio"], "broken.flac", { type: "audio/flac" }),
      }),
      createSelectedFile({
        id: asFileId("extra-1"),
        kind: "extra",
        label: "cover.jpg",
        file: extraFile,
      }),
    ];

    const statusMap = new Map<FileId, JobStatus>([
      [
        asFileId("audio-1"),
        { status: "completed", jobId: "job-1", outputFilename: "track-output.mp3" },
      ],
      [asFileId("audio-2"), { status: "failed", jobId: "job-2", error: "failed" }],
    ]);

    await downloadZip(files, statusMap, "My Album", "mp3");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/download/track-output.mp3?id=job-1");

    expect(zipMock).toHaveBeenCalledTimes(1);
    const [zipInput] = zipMock.mock.calls[0] as [
      Record<string, [Uint8Array, { level: 0 }]>,
    ];
    expect(Object.keys(zipInput)).toEqual(["Track é.mp3", "cover.jpg"]);
    expect(zipInput["Track é.mp3"][0]).toBeInstanceOf(Uint8Array);
    expect(zipInput["cover.jpg"][0]).toBeInstanceOf(Uint8Array);

    const anchor = createdAnchor as HTMLAnchorElement | null;
    expect(anchor).not.toBeNull();
    expect((anchor as HTMLAnchorElement).download).toBe("My Album (mp3).zip");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });
});
