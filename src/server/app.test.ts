import { describe, it, expect } from "vitest";
import { buildApp } from "./app.js";

describe("POST /transcode", () => {
  it("returns 202 accepted", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/transcode",
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ status: "accepted" });
  });
});
