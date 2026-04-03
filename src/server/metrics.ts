import type { FastifyInstance, FastifyRequest } from "fastify";
import { collectDefaultMetrics, Counter, Histogram, Registry } from "prom-client";

function getRouteLabel(request: FastifyRequest): string {
  return request.routeOptions?.url ?? request.url.split("?")[0] ?? "unknown";
}

export function registerMetrics(app: FastifyInstance) {
  const registry = new Registry();

  collectDefaultMetrics({
    register: registry,
    prefix: "audio_transcoding_server_",
  });

  const httpRequestsTotal = new Counter({
    name: "audio_transcoding_http_requests_total",
    help: "Total number of HTTP requests handled by the server",
    labelNames: ["method", "route", "status_code"] as const,
    registers: [registry],
  });

  const httpRequestDurationSeconds = new Histogram({
    name: "audio_transcoding_http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
    registers: [registry],
  });

  const requestStartedAt = new WeakMap<FastifyRequest, bigint>();

  app.addHook("onRequest", (request, _reply, done) => {
    requestStartedAt.set(request, process.hrtime.bigint());
    done();
  });

  app.addHook("onResponse", (request, reply, done) => {
    const start = requestStartedAt.get(request);
    if (start) {
      const durationSecs = Number(process.hrtime.bigint() - start) / 1_000_000_000;
      const labels = {
        method: request.method,
        route: getRouteLabel(request),
        status_code: String(reply.statusCode),
      };

      httpRequestsTotal.inc(labels);
      httpRequestDurationSeconds.observe(labels, durationSecs);

      requestStartedAt.delete(request);
    }

    done();
  });

  app.get("/metrics", async (_request, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });
}
