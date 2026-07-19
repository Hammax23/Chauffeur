import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  ChatMessage,
  getCustomerChat,
  getDriverChat,
  sendCustomerChatMessage,
  sendDriverChatMessage,
} from "../services/api";
import { openSseStream, type SseConnectionStatus, type SseStreamHandle } from "../services/sse-client";

const ACCENT = "#C9A063";
const FALLBACK_POLL_MS = 5_000;
const SSE_BOOTSTRAP_MS = 4_000;

type Role = "driver" | "customer";

type Props = {
  bookingId: string;
  role: Role;
  title?: string;
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function sortMessages(list: ChatMessage[]) {
  return [...list].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function mergeById(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] | null {
  if (incoming.length === 0) return null;
  const map = new Map(prev.map((m) => [m.id, m]));
  let changed = false;
  for (const m of incoming) {
    if (!map.has(m.id)) {
      changed = true;
      map.set(m.id, m);
    }
  }
  if (!changed) return null;
  return sortMessages(Array.from(map.values()));
}

function replaceMessage(prev: ChatMessage[], tempId: string, next: ChatMessage): ChatMessage[] {
  const idx = prev.findIndex((m) => m.id === tempId);
  if (idx === -1) return sortMessages([...prev, next]);
  const copy = [...prev];
  copy[idx] = next;
  return sortMessages(copy);
}

type ChatBubbleProps = {
  item: ChatMessage;
  isMine: boolean;
  pending?: boolean;
};

const ChatBubble = memo(function ChatBubble({ item, isMine, pending }: ChatBubbleProps) {
  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther, pending && styles.bubblePending]}>
        <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.body}</Text>
        <View style={styles.bubbleMeta}>
          {pending ? <Text style={[styles.pendingLabel, isMine && styles.pendingLabelMine]}>Sending…</Text> : null}
          <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
});

export default function TripChatScreen({ bookingId, role, title }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [canSend, setCanSend] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [connection, setConnection] = useState<SseConnectionStatus>("connecting");

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const pendingTempIds = useRef<Set<string>>(new Set());
  const sseReady = useRef(false);
  const lastMessageAt = useRef<string | null>(null);
  const shouldStickToBottom = useRef(true);

  const mine = role === "driver" ? "DRIVER" : "CUSTOMER";

  const applySnapshot = useCallback((incoming: ChatMessage[], nextCanSend?: boolean) => {
    setMessages((prev) => {
      const merged = mergeById(prev, incoming);
      const next = merged ?? prev;
      knownIds.current = new Set(next.map((m) => m.id));
      if (next.length > 0) {
        lastMessageAt.current = next[next.length - 1].createdAt;
      }
      return merged ?? prev;
    });
    if (typeof nextCanSend === "boolean") setCanSend(nextCanSend);
    setBootstrapping(false);
    setError("");
  }, []);

  const appendLiveMessage = useCallback((message: ChatMessage) => {
    if (knownIds.current.has(message.id) || pendingTempIds.current.has(message.id)) return;
    knownIds.current.add(message.id);
    lastMessageAt.current = message.createdAt;
    setMessages((prev) => sortMessages([...prev, message]));
  }, []);

  const fetchHttp = useCallback(
    async (incremental = false) => {
      if (!bookingId) return;
      try {
        const since = incremental ? lastMessageAt.current ?? undefined : undefined;
        const res =
          role === "driver"
            ? await getDriverChat(bookingId, since)
            : await getCustomerChat(bookingId, since);
        if (res.success) {
          applySnapshot(res.messages || [], !!res.canSend);
        } else if (!sseReady.current) {
          setError(res.error || "Unable to load chat");
          setBootstrapping(false);
        }
      } catch (e) {
        if (!sseReady.current) {
          setError(e instanceof Error ? e.message : "Unable to load chat");
          setBootstrapping(false);
        }
      }
    },
    [applySnapshot, bookingId, role]
  );

  // SSE is the primary realtime channel — no duplicate initial HTTP load.
  useEffect(() => {
    if (!bookingId) return;

    let handle: SseStreamHandle | null = null;
    let bootstrapTimer: ReturnType<typeof setTimeout> | null = null;

    const path =
      role === "driver"
        ? `/driver/rides/${bookingId}/chat/stream`
        : `/customer/reservations/${bookingId}/chat/stream`;

    handle = openSseStream(
      { path },
      {
        onStatus: (status) => setConnection(status),
        onEvent: (event) => {
          if (event.type === "snapshot") {
            try {
              const data = JSON.parse(event.data) as {
                messages?: ChatMessage[];
                canSend?: boolean;
              };
              sseReady.current = true;
              applySnapshot(data.messages || [], data.canSend);
            } catch {
              /* ignore */
            }
            return;
          }
          if (event.type === "message") {
            try {
              const data = JSON.parse(event.data) as { message?: ChatMessage };
              if (data.message) appendLiveMessage(data.message);
            } catch {
              /* ignore */
            }
          }
        },
      }
    );

    bootstrapTimer = setTimeout(() => {
      if (!sseReady.current) {
        void fetchHttp(false);
      }
    }, SSE_BOOTSTRAP_MS);

    return () => {
      if (bootstrapTimer) clearTimeout(bootstrapTimer);
      handle?.close();
      sseReady.current = false;
    };
  }, [appendLiveMessage, applySnapshot, bookingId, fetchHttp, role]);

  // Lightweight fallback poll only when live stream is down.
  useEffect(() => {
    if (!bookingId || connection === "open") return;
    const t = setInterval(() => {
      void fetchHttp(true);
    }, FALLBACK_POLL_MS);
    return () => clearInterval(t);
  }, [bookingId, connection, fetchHttp]);

  useEffect(() => {
    if (messages.length === 0 || !shouldStickToBottom.current) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: messages.length > 8 });
    });
  }, [messages.length]);

  const onSend = async () => {
    const body = text.trim();
    if (!body || sending || !canSend) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      senderType: mine,
      senderId: "local",
      body,
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    pendingTempIds.current.add(tempId);
    shouldStickToBottom.current = true;
    setText("");
    setSending(true);
    setError("");
    setMessages((prev) => sortMessages([...prev, optimistic]));

    try {
      const res =
        role === "driver"
          ? await sendDriverChatMessage(bookingId, body)
          : await sendCustomerChatMessage(bookingId, body);

      pendingTempIds.current.delete(tempId);

      if (res.success && res.message) {
        knownIds.current.add(res.message.id);
        lastMessageAt.current = res.message.createdAt;
        setMessages((prev) => replaceMessage(prev, tempId, res.message));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setText(body);
        setError(res.error || "Failed to send");
      }
    } catch (e) {
      pendingTempIds.current.delete(tempId);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(body);
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const connectionLabel = useMemo(() => {
    if (connection === "open") return "Live";
    if (connection === "reconnecting" || connection === "connecting") return "Connecting…";
    return "Offline";
  }, [connection]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatBubble
        item={item}
        isMine={item.senderType === mine}
        pending={item.id.startsWith("temp-")}
      />
    ),
    [mine]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color="#111" />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>{title || "Trip chat"}</Text>
            <View style={styles.headerMetaRow}>
              <Text style={styles.headerSub}>{bookingId}</Text>
              <View style={styles.statusPill}>
                <View
                  style={[
                    styles.statusDot,
                    connection === "open" ? styles.statusDotLive : styles.statusDotIdle,
                  ]}
                />
                <Text style={styles.statusText}>{connectionLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.listContentEmpty,
          ]}
          initialNumToRender={16}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onScrollBeginDrag={() => {
            shouldStickToBottom.current = false;
          }}
          onContentSizeChange={() => {
            if (shouldStickToBottom.current) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListEmptyComponent={
            bootstrapping ? (
              <View style={styles.empty}>
                <ActivityIndicator color={ACCENT} />
                <Text style={styles.emptySub}>Loading conversation…</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={36} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySub}>
                  {canSend
                    ? "Say hello to coordinate pickup."
                    : "Chat opens after the driver accepts the ride."}
                </Text>
              </View>
            )
          }
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.composer}>
          {!canSend ? (
            <Text style={styles.closedHint}>Chat is read-only for this ride.</Text>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={canSend ? "Type a message…" : "Messaging unavailable"}
              placeholderTextColor="#94a3b8"
              editable={canSend && !sending}
              multiline
              maxLength={2000}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!canSend || !text.trim() || sending) && styles.sendBtnDisabled]}
              disabled={!canSend || !text.trim() || sending}
              onPress={onSend}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: { padding: 6, marginRight: 4 },
  headerTextCol: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  headerMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  headerSub: { fontSize: 12, color: "#64748b", flex: 1 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#f8fafc",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotLive: { backgroundColor: "#10B981" },
  statusDotIdle: { backgroundColor: "#94a3b8" },
  statusText: { fontSize: 10, fontWeight: "600", color: "#64748b" },
  listContent: { paddingHorizontal: 14, paddingVertical: 16 },
  listContentEmpty: { flexGrow: 1, justifyContent: "center" },
  empty: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 32 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: "600", color: "#334155" },
  emptySub: { marginTop: 8, fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 18 },
  bubbleRow: { marginBottom: 10, flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubblePending: { opacity: 0.72 },
  bubbleMine: { backgroundColor: "#1C1C1E", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#f1f5f9", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: "#0f172a", lineHeight: 20 },
  bubbleTextMine: { color: "#fff" },
  bubbleMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, alignSelf: "flex-end" },
  pendingLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  pendingLabelMine: { color: "rgba(255,255,255,0.55)" },
  bubbleTime: { fontSize: 10, color: "#94a3b8" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.55)" },
  errorText: { color: "#dc2626", fontSize: 12, paddingHorizontal: 16, paddingBottom: 4 },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },
  closedHint: { fontSize: 12, color: "#94a3b8", marginBottom: 6, paddingHorizontal: 4 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
