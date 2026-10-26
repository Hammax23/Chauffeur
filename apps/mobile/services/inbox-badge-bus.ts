/** Lightweight pub/sub so tab layouts refresh Inbox unread when a chat push arrives. */

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeInboxBadgeRefresh(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitInboxBadgeRefresh() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore */
    }
  });
}
