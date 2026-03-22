import { describe, it, expect } from "vitest";
import { buildApp } from "../app.js";
import { useQueue, submitTranscodeRequest } from "../test-helpers.js";

useQueue();

describe("GET /status/:id", () => {
  it("returns 404 for unknown id", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/status/non-existent-id",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Processing request not found" });
  });

  it("returns pending status for a newly submitted request", async () => {
    const { app, id } = await submitTranscodeRequest();

    const response = await app.inject({
      method: "GET",
      url: `/status/${id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(["pending", "processing"]).toContain(response.json().status);
  });
});
