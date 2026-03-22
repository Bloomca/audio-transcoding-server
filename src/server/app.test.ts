import { describe, it, expect } from "vitest";
import FormData from "form-data";
import { buildApp } from "./app.js";

describe("POST /transcode", () => {
  it("returns 202 accepted", async () => {
    const app = buildApp();

    const form = new FormData();
    form.append("file", Buffer.from("fake audio content"), {
      filename: "test.flac",
      contentType: "audio/flac",
    });

    const response = await app.inject({
      method: "POST",
      url: "/transcode",
      payload: form,
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ status: "accepted" });
  });
});
