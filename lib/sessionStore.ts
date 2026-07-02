import crypto from "node:crypto";
import type { Session } from "@/types";

if (!(globalThis as any).sessionStore) {
  (globalThis as any).sessionStore = new Map<string, Session>();
  console.log("[sessionStore] Initialized global session store.");
}

const STORE = (globalThis as any).sessionStore as Map<string, Session>;

function createSession(params: {
  clientMac: string;
  apMac: string;
  ssid: string;
  site: string;
  redirectUrl: string;
}): Session {
  const id = crypto.randomUUID();
  const now = Date.now();

  const session: Session = {
    id,
    status: "PENDING",
    clientMac: params.clientMac,
    apMac: params.apMac,
    ssid: params.ssid,
    site: params.site,
    redirectUrl: params.redirectUrl,
    initialFollowerCount: 0,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000,
  };

  STORE.set(id, session);
  console.log(`[sessionStore] Created session ${id}`);
  return session;
}

function findByToken(token: string): Session | undefined {
  return STORE.get(token);
}

function updateStatus(
  id: string,
  status: Session["status"],
  meta?: Record<string, unknown>
): void {
  const session = STORE.get(id);
  if (!session) {
    console.warn(`[sessionStore] Cannot update status: session ${id} not found`);
    return;
  }
  session.status = status;
  if (meta) {
    Object.assign(session, meta);
  }
  console.log(`[sessionStore] Session ${id} status -> ${status}`);
}

function cleanupExpired(): void {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, session] of STORE) {
    if (session.expiresAt < now) {
      STORE.delete(id);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[sessionStore] Cleaned up ${cleaned} expired session(s)`);
  }
}

setInterval(cleanupExpired, 30_000);

export const sessionStore = {
  createSession,
  findByToken,
  updateStatus,
};
