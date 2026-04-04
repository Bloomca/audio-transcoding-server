import { describe, it, expect } from "vitest";
import { buildApp } from "../app.js";
import { config } from "../../shared/config.js";

describe("global rate limit", () => {
  it("returns 429 after max requests in the configured window", async () => {
    const app = buildApp();

    for (let i = 0; i < config.rateLimitMaxRequests; i += 1) {
      const response = await app.inject({
        method: "GET",
        url: "/status/non-existent-id",
      });
      expect(response.statusCode).toBe(404);
    }

    const limitedResponse = await app.inject({
      method: "GET",
      url: "/status/non-existent-id",
    });
    expect(limitedResponse.statusCode).toBe(429);

    await app.close();
  });

  it("does not apply rate limits to /metrics", async () => {
    const app = buildApp();

    for (let i = 0; i < config.rateLimitMaxRequests + 5; i += 1) {
      const response = await app.inject({ method: "GET", url: "/metrics" });
      expect(response.statusCode).toBe(200);
    }

    const statusResponse = await app.inject({
      method: "GET",
      url: "/status/non-existent-id",
    });
    expect(statusResponse.statusCode).toBe(404);

    await app.close();
  });
});
