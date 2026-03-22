import { describe, it, expect } from "vitest";
import { buildApp } from "../app.js";

describe("GET /", () => {
  it("returns the client entrypoint", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("<title>Audio Transcoder</title>");
  });
});
