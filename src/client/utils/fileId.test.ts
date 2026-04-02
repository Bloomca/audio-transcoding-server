// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createStableFileId } from "./fileId";

describe("client/utils/fileId", () => {
  it("returns the same id for the same file fingerprint", async () => {
    const fileA = new File(["audio"], "track.flac", {
      type: "audio/flac",
      lastModified: 1710000000000,
    });
    const fileB = new File(["audio"], "track.flac", {
      type: "audio/flac",
      lastModified: 1710000000000,
    });

    const idA = await createStableFileId(fileA, "track.flac");
    const idB = await createStableFileId(fileB, "track.flac");

    expect(idA).toBe(idB);
  });

  it("changes when label changes", async () => {
    const file = new File(["audio"], "track.flac", {
      type: "audio/flac",
      lastModified: 1710000000000,
    });

    const id1 = await createStableFileId(file, "album1/track.flac");
    const id2 = await createStableFileId(file, "album2/track.flac");

    expect(id1).not.toBe(id2);
  });
});
