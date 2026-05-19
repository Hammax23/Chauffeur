import { API_BASE_URL, getToken } from "./api";

/**
 * Generic Server-Sent Events client built on React Native's XMLHttpRequest.
 *
 * Why XHR and not fetch streaming or EventSource:
 *   • EventSource is not available in React Native.
 *   • fetch + ReadableStream is inconsistent between iOS / Android / Hermes.
 *   • XHR exposes incremental responseText reliably, supports custom auth
 *     headers, and abort() ends the connection cleanly.
 *
 * Features:
 *   • Authorization: Bearer <token> (token loaded fresh on each (re)connect)
 *   • Frame parser handles `event:` / `data:` blocks separated by "\n\n"
 *   • Comment lines (": ...") are treated as heartbeats — they bump the
 *     activity clock so the heartbeat watcher doesn't trigger a reconnect.
 *   • Exponential backoff on disconnect (1.5s → 30s cap, reset on success)
 *   • close() aborts immediately and disables future reconnects
 *
 * Each instance is single-use — call openSseStream() once per subscription.
 */

const HEARTBEAT_GRACE_MS = 45_000;
const INITIAL_BACKOFF_MS = 1_500;
const MAX_BACKOFF_MS = 30_000;

export type SseConnectionStatus = "idle" | "connecting" | "open" | "reconnecting" | "closed";

export interface SseEvent {
  /** Value of `event:` line (defaults to "message"). */
  type: string;
  /** Joined value of all `data:` lines for this frame. */
  data: string;
}

export interface SseStreamHandlers {
  onEvent: (event: SseEvent) => void;
  onStatus?: (status: SseConnectionStatus, info?: { error?: string; nextRetryMs?: number }) => void;
}

export interface SseStreamHandle {
  close(): void;
}

export interface SseStreamOptions {
  /**
   * Path beginning with "/" — appended to API_BASE_URL. Example: "/customer/stream".
   * Pass an absolute URL only if you also want to bypass API_BASE_URL.
   */
  path: string;
}

export function openSseStream(
  options: SseStreamOptions,
  handlers: SseStreamHandlers
): SseStreamHandle {
  let xhr: XMLHttpRequest | null = null;
  let buffer = "";
  let lastByteIndex = 0;
  let lastActivityAt = Date.now();
  let backoffMs = INITIAL_BACKOFF_MS;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const setStatus = (status: SseConnectionStatus, info?: { error?: string; nextRetryMs?: number }) => {
    handlers.onStatus?.(status, info);
  };

  const abortXhr = () => {
    if (xhr) {
      try {
        xhr.onreadystatechange = null;
        xhr.onerror = null;
        xhr.onabort = null;
        xhr.abort();
      } catch {
        /* ignore */
      }
      xhr = null;
    }
  };

  const stopHeartbeatWatcher = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const scheduleReconnect = (reason: string) => {
    if (stopped) return;
    abortXhr();
    stopHeartbeatWatcher();
    const delay = Math.min(backoffMs, MAX_BACKOFF_MS);
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    setStatus("reconnecting", { error: reason, nextRetryMs: delay });
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const handleFrame = (frame: string) => {
    let eventType = "message";
    const dataLines: string[] = [];
    for (const rawLine of frame.split("\n")) {
      if (!rawLine) continue;
      if (rawLine.startsWith(":")) {
        // Heartbeat / comment — keep activity timer warm but do not dispatch.
        lastActivityAt = Date.now();
        continue;
      }
      const colon = rawLine.indexOf(":");
      const field = colon === -1 ? rawLine : rawLine.slice(0, colon);
      const valueStart = colon === -1 ? rawLine.length : colon + (rawLine[colon + 1] === " " ? 2 : 1);
      const value = rawLine.slice(valueStart);
      if (field === "event") {
        eventType = value;
      } else if (field === "data") {
        dataLines.push(value);
      }
    }
    if (dataLines.length === 0) return;
    handlers.onEvent({ type: eventType, data: dataLines.join("\n") });
  };

  const flushFrames = (chunk: string) => {
    buffer += chunk;
    while (true) {
      const sepIndex = buffer.indexOf("\n\n");
      if (sepIndex === -1) return;
      const frame = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      lastActivityAt = Date.now();
      handleFrame(frame);
    }
  };

  const startHeartbeatWatcher = () => {
    stopHeartbeatWatcher();
    heartbeatTimer = setInterval(() => {
      if (Date.now() - lastActivityAt > HEARTBEAT_GRACE_MS) {
        scheduleReconnect("Heartbeat timeout");
      }
    }, 5_000);
  };

  const connect = async () => {
    if (stopped) return;
    setStatus("connecting");

    let token: string | null = null;
    try {
      token = await getToken();
    } catch {
      token = null;
    }

    if (stopped) return;
    if (!token) {
      scheduleReconnect("Not authenticated");
      return;
    }

    buffer = "";
    lastByteIndex = 0;
    lastActivityAt = Date.now();

    const url = options.path.startsWith("http") ? options.path : `${API_BASE_URL}${options.path}`;
    const request = new XMLHttpRequest();
    xhr = request;

    try {
      request.open("GET", url, true);
    } catch (e) {
      scheduleReconnect(e instanceof Error ? e.message : "Open failed");
      return;
    }

    request.setRequestHeader("Accept", "text/event-stream");
    request.setRequestHeader("Cache-Control", "no-cache");
    request.setRequestHeader("Authorization", `Bearer ${token}`);

    request.onreadystatechange = () => {
      if (xhr !== request) return;
      if (request.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
        if (request.status === 401 || request.status === 403) {
          scheduleReconnect(`Auth ${request.status}`);
          return;
        }
        if (request.status < 200 || request.status >= 300) {
          scheduleReconnect(`HTTP ${request.status}`);
          return;
        }
        backoffMs = INITIAL_BACKOFF_MS;
        setStatus("open");
        startHeartbeatWatcher();
      }

      if (request.readyState === XMLHttpRequest.LOADING || request.readyState === XMLHttpRequest.DONE) {
        const text = request.responseText || "";
        if (text.length > lastByteIndex) {
          const chunk = text.slice(lastByteIndex);
          lastByteIndex = text.length;
          flushFrames(chunk);
        }
      }

      if (request.readyState === XMLHttpRequest.DONE && xhr === request) {
        scheduleReconnect("Connection ended");
      }
    };

    request.onerror = () => {
      if (xhr !== request) return;
      scheduleReconnect("Network error");
    };

    request.ontimeout = () => {
      if (xhr !== request) return;
      scheduleReconnect("Request timeout");
    };

    try {
      request.send();
    } catch (e) {
      scheduleReconnect(e instanceof Error ? e.message : "Send failed");
    }
  };

  connect();

  return {
    close() {
      if (stopped) return;
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      stopHeartbeatWatcher();
      abortXhr();
      setStatus("closed");
    },
  };
}
