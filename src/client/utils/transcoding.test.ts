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
    const requests: Array<{
      method?: string;
      url?: string;
      body?: Document | XMLHttpRequestBodyInit | null;
    }> = [];

    class MockXMLHttpRequest {
      status = 200;
      responseText = JSON.stringify({ id: "job-123" });
      method: string | undefined;
      url: string | undefined;
      upload = {
        onprogress:
          null as
            | ((this: XMLHttpRequestUpload, ev: ProgressEvent<EventTarget>) => unknown)
            | null,
      };
      onload: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null;
      onerror: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null;
      onabort: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null;

      open(method: string, url: string) {
        this.method = method;
        this.url = url;
      }

      send(body?: Document | XMLHttpRequestBodyInit | null) {
        requests.push({ method: this.method, url: this.url, body: body ?? null });
        this.upload.onprogress?.call(this as unknown as XMLHttpRequestUpload, {
          lengthComputable: true,
          loaded: 5,
          total: 10,
        } as ProgressEvent<EventTarget>);
        this.onload?.call(
          this as unknown as XMLHttpRequest,
          {} as ProgressEvent<EventTarget>,
        );
      }
    }

    vi.stubGlobal(
      "XMLHttpRequest",
      MockXMLHttpRequest as unknown as typeof XMLHttpRequest,
    );

    const onProgress = vi.fn();
    const file = new File(["content"], "album.flac", { type: "audio/flac" });
    const jobId = await transcode(file, "ogg", onProgress);

    expect(jobId).toBe("job-123");
    expect(requests).toHaveLength(1);

    const [request] = requests;
    expect(request?.url).toBe("/transcode");
    expect(request?.method).toBe("POST");

    const body = request?.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("outputFormat")).toBe("ogg");

    const uploadedFile = body.get("file");
    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe("album.flac");
    expect(onProgress).toHaveBeenCalledWith(50);
    expect(onProgress).toHaveBeenCalledWith(100);
  });
});
