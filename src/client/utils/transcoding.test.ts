import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canTranscodeFile, transcode } from "./transcoding";
import { jobStatus$ } from "../jobStatusStore";
import type { SelectedFile } from "../components/SelectedFileRow";
import { asFileId } from "./fileId";

function createSelectedFile(overrides: Partial<SelectedFile> = {}): SelectedFile {
  return {
    id: asFileId("file-1"),
    label: "track.flac",
    kind: "audio",
    file: new File(["audio"], "track.flac", { type: "audio/flac" }),
    ...overrides,
  };
}

describe("client/utils/transcoding", () => {
  beforeEach(() => {
    jobStatus$.set(new Map());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("canTranscodeFile returns true only for transcodable cases", () => {
    const extra = createSelectedFile({ kind: "extra" });
    expect(canTranscodeFile(extra)).toBe(false);

    const freshAudio = createSelectedFile();
    expect(canTranscodeFile(freshAudio)).toBe(true);

    const queuedAudio = createSelectedFile({ id: asFileId("file-queue") });
    jobStatus$.set(
      new Map([[asFileId("file-queue"), { status: "pending", jobId: "job-1" }]]),
    );
    expect(canTranscodeFile(queuedAudio)).toBe(false);

    jobStatus$.set(
      new Map([[asFileId("file-queue"), { status: "failed", error: "ffmpeg failed" }]]),
    );
    expect(canTranscodeFile(queuedAudio)).toBe(true);
  });

  it("transcode sends multipart request and returns job id", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ id: "job-123" }), {
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["content"], "album.flac", { type: "audio/flac" });
    const jobId = await transcode(file, "ogg");

    expect(jobId).toBe("job-123");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const firstCall = fetchMock.mock.calls[0];
    if (!firstCall) throw new Error("fetch was not called");

    const [url, init] = firstCall;

    expect(url).toBe("/transcode");
    expect(init?.method).toBe("POST");

    if (!init) throw new Error("Request init is missing");

    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("outputFormat")).toBe("ogg");

    const uploadedFile = body.get("file");
    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe("album.flac");
  });
});
