// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { attachComponent, createElement, createState } from "veles";
import { jobStatus$ } from "../jobStatusStore";
import { asFileId } from "../utils/fileId";
import { SelectedFileRow, type SelectedFile } from "./SelectedFileRow";

function createSelectedFile(overrides: Partial<SelectedFile> = {}): SelectedFile {
  return {
    id: asFileId("file-1"),
    label: "track.flac",
    kind: "audio",
    file: new File(["audio"], "track.flac", { type: "audio/flac" }),
    ...overrides,
  };
}

async function flushUi() {
  await Promise.resolve();
}

describe("client/components/SelectedFileRow", () => {
  let root: HTMLDivElement;
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.append(root);
    jobStatus$.set(new Map());
  });

  afterEach(() => {
    cleanup?.();
    root.remove();
    jobStatus$.set(new Map());
  });

  it("shows progress for processing and error for failed jobs", async () => {
    const file$ = createState(createSelectedFile());

    cleanup = attachComponent({
      htmlElement: root,
      component: createElement("ul", {
        children: createElement(SelectedFileRow, { file$ }),
      }),
    });

    jobStatus$.set(
      new Map([[asFileId("file-1"), { status: "processing", jobId: "job-1", progress: 42 }]]),
    );
    await flushUi();

    const progressEl = root.querySelector("progress") as HTMLProgressElement;
    expect(progressEl).not.toBeNull();
    expect(progressEl.hidden).toBe(false);
    expect(progressEl.value).toBe(42);
    expect(root.querySelector(".error-message")).toBeNull();

    jobStatus$.set(
      new Map([[asFileId("file-1"), { status: "failed", jobId: "job-1", error: "transcoding failed" }]]),
    );
    await flushUi();

    const updatedProgress = root.querySelector("progress") as HTMLProgressElement;
    const errorMessage = root.querySelector(".error-message") as HTMLElement;

    expect(updatedProgress.hidden).toBe(true);
    expect(errorMessage).not.toBeNull();
    expect(errorMessage.textContent).toContain("Something went wrong");
    expect(errorMessage.getAttribute("title")).toBe("Error: transcoding failed");
  });
});
