import { randomUUID } from "node:crypto";

// Maps sessionId → set of jobIds belonging to that session
const sessionStore = new Map<string, Set<string>>();

function parseCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function getOrCreateSession(cookieHeader: string | undefined): {
  sessionId: string;
  isNew: boolean;
} {
  const existing = parseCookie(cookieHeader, "sessionId");
  if (existing && sessionStore.has(existing)) {
    return { sessionId: existing, isNew: false };
  }
  const sessionId = randomUUID();
  sessionStore.set(sessionId, new Set());
  return { sessionId, isNew: true };
}

function addJobToSession(sessionId: string, jobId: string): void {
  sessionStore.get(sessionId)?.add(jobId);
}

function getSessionJobs(sessionId: string): Set<string> | undefined {
  return sessionStore.get(sessionId);
}

function sessionCookie(sessionId: string): string {
  return `sessionId=${sessionId}; HttpOnly; SameSite=Strict; Path=/`;
}

export {
  addJobToSession,
  getOrCreateSession,
  getSessionJobs,
  parseCookie,
  sessionCookie,
};
