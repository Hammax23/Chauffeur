import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";

/**
 * Cross-process fan-out for live SSE buses (driver / reservation / chat).
 *
 * Local EventEmitter stays the hot path (same process = instant).
 * Postgres LISTEN/NOTIFY mirrors publishes to every other Node process
 * so PM2 / multi-replica deploys don't drop events.
 *
 * Payload limit: Postgres NOTIFY ~8KB. Oversized events send a poke;
 * the receiving process reloads from DB when a reload handler is registered.
 */

const PG_CHANNEL = "sarj_realtime";
const MAX_NOTIFY_BYTES = 7500;

export type CrossBusName = "reservation" | "driver" | "chat";

export type CrossBusEnvelope = {
  v: 1;
  origin: string;
  bus: CrossBusName;
  /** Single channel (legacy / one-target publish) */
  channel?: string;
  /** Multi-channel fan-out in one NOTIFY (batch publish) */
  channels?: string[];
  /** Full event JSON when it fits; omitted on poke */
  payload?: unknown;
  /** True when payload was too large — receivers should reload */
  poke?: boolean;
  /** Monotonic process-local sequence for debugging / gap detection */
  seq?: number;
};

type ReloadHandler = (envelope: CrossBusEnvelope) => void | Promise<void>;

declare global {
  // eslint-disable-next-line no-var
  var __sarjCrossProcessBus: {
    origin: string;
    local: EventEmitter;
    listenStarted: boolean;
    listenPromise: Promise<void> | null;
    reloadHandlers: Map<CrossBusName, ReloadHandler>;
    seq: number;
  } | undefined;
}

function state() {
  if (!globalThis.__sarjCrossProcessBus) {
    const local = new EventEmitter();
    local.setMaxListeners(0);
    globalThis.__sarjCrossProcessBus = {
      origin: randomUUID(),
      local,
      listenStarted: false,
      listenPromise: null,
      reloadHandlers: new Map(),
      seq: 0,
    };
  }
  return globalThis.__sarjCrossProcessBus;
}

function nextSeq(): number {
  const s = state();
  s.seq += 1;
  return s.seq;
}

function byteLength(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

/** Register how to rebuild a full event when a poke arrives (oversized NOTIFY). */
export function registerCrossBusReload(bus: CrossBusName, handler: ReloadHandler): void {
  state().reloadHandlers.set(bus, handler);
}

/**
 * Subscribe to a cross-bus channel. Starts the Postgres LISTEN connection
 * lazily on first subscriber in this process.
 */
export function subscribeCrossBus(
  bus: CrossBusName,
  channel: string,
  listener: (payload: unknown) => void
): () => void {
  const key = `${bus}|${channel}`;
  const { local } = state();
  local.on(key, listener);
  void ensureListen();
  return () => local.off(key, listener);
}

/** Local emit only — used when reconstructing an oversized poke (no re-NOTIFY). */
export function emitCrossBusLocal(
  bus: CrossBusName,
  channel: string,
  payload: unknown
): void {
  state().local.emit(`${bus}|${channel}`, payload);
}

function emitLocalMany(bus: CrossBusName, channels: string[], payload: unknown): void {
  const { local } = state();
  for (const channel of channels) {
    local.emit(`${bus}|${channel}`, payload);
  }
}

/** Emit locally + fan out via NOTIFY (fire-and-forget). */
export function publishCrossBus(
  bus: CrossBusName,
  channel: string,
  payload: unknown
): void {
  publishCrossBusMany(bus, [channel], payload);
}

/**
 * Emit to many channels locally + one Postgres NOTIFY (O(1) fan-out across workers).
 */
export function publishCrossBusMany(
  bus: CrossBusName,
  channels: string[],
  payload: unknown
): void {
  const unique = [...new Set(channels.filter(Boolean))];
  if (unique.length === 0) return;

  const { origin } = state();
  emitLocalMany(bus, unique, payload);

  const seq = nextSeq();
  const full: CrossBusEnvelope =
    unique.length === 1
      ? { v: 1, origin, bus, channel: unique[0], payload, seq }
      : { v: 1, origin, bus, channels: unique, payload, seq };

  const fullJson = JSON.stringify(full);
  const envelope: CrossBusEnvelope =
    byteLength(fullJson) <= MAX_NOTIFY_BYTES
      ? full
      : {
          v: 1,
          origin,
          bus,
          channel: unique[0],
          channels: unique.length > 1 ? unique : undefined,
          poke: true,
          seq,
        };

  void notifyPostgres(JSON.stringify(envelope)).catch((err) => {
    console.error("[cross-process-bus] NOTIFY failed:", err);
  });
}

/** Warm LISTEN early so the first publish is not racing cold start. */
export function warmCrossProcessBus(): void {
  void ensureListen();
}

async function notifyPostgres(payload: string): Promise<void> {
  const { default: prisma } = await import("@/lib/prisma");
  await prisma.$executeRaw`SELECT pg_notify(${PG_CHANNEL}, ${payload})`;
}

async function ensureListen(): Promise<void> {
  const s = state();
  if (s.listenStarted) return s.listenPromise ?? undefined;
  s.listenStarted = true;
  s.listenPromise = startListen().catch((err) => {
    console.error("[cross-process-bus] LISTEN failed to start:", err);
    s.listenStarted = false;
    s.listenPromise = null;
  });
  return s.listenPromise ?? undefined;
}

async function startListen(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("[cross-process-bus] DATABASE_URL missing — local bus only");
    return;
  }

  const { Client } = await import("pg");
  const client = new Client({ connectionString: databaseUrl });

  client.on("error", (err) => {
    console.error("[cross-process-bus] LISTEN client error:", err);
  });

  client.on("notification", (msg) => {
    if (msg.channel !== PG_CHANNEL || !msg.payload) return;
    void handleRemoteNotify(msg.payload);
  });

  await client.connect();
  await client.query(`LISTEN ${PG_CHANNEL}`);
  console.info("[cross-process-bus] LISTEN ready on", PG_CHANNEL);

  // Keep alive — idle connections can be dropped by some hosts
  const keepalive = setInterval(() => {
    client.query("SELECT 1").catch(() => {
      /* reconnect handled below */
    });
  }, 30_000);
  if (typeof keepalive.unref === "function") keepalive.unref();

  client.on("end", () => {
    clearInterval(keepalive);
    const s = state();
    s.listenStarted = false;
    s.listenPromise = null;
    const jitter = 1500 + Math.floor(Math.random() * 1500);
    console.warn(`[cross-process-bus] LISTEN ended — reconnect in ${jitter}ms`);
    setTimeout(() => {
      void ensureListen();
    }, jitter);
  });
}

async function handleRemoteNotify(raw: string): Promise<void> {
  let envelope: CrossBusEnvelope;
  try {
    envelope = JSON.parse(raw) as CrossBusEnvelope;
  } catch {
    return;
  }
  if (!envelope || envelope.v !== 1) return;

  const s = state();
  // Ignore our own echoes
  if (envelope.origin === s.origin) return;

  const channels =
    envelope.channels && envelope.channels.length > 0
      ? envelope.channels
      : envelope.channel
        ? [envelope.channel]
        : [];

  if (envelope.poke) {
    const reload = s.reloadHandlers.get(envelope.bus);
    if (reload) {
      try {
        // Reload once per channel that looks like reservation:bookingId
        if (channels.length === 0) {
          await reload(envelope);
        } else {
          for (const channel of channels) {
            await reload({ ...envelope, channel, channels: undefined });
          }
        }
      } catch (err) {
        console.error("[cross-process-bus] reload handler failed:", err);
      }
    }
    return;
  }

  if (envelope.payload !== undefined) {
    emitLocalMany(envelope.bus, channels, envelope.payload);
  }
}
