import { useCallback, useEffect, useRef, useState } from "react";
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
import { openSseStream, type SseStreamHandle } from "../services/sse-client";

const ACCENT = "#C9A063";
const POLL_MS = 5_000;

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

export default function TripChatScreen({ bookingId, role, title }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [canSend, setCanSend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const knownIds = useRef<Set<string>>(new Set());

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const map = new Map<string, ChatMessage>();
      for (const m of prev) map.set(m.id, m);
      for (const m of incoming) map.set(m.id, m);
      const next = Array.from(map.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      knownIds.current = new Set(next.map((m) => m.id));
      return next;
    });
  }, []);

  const appendMessage = useCallback((message: ChatMessage) => {
    if (knownIds.current.has(message.id)) return;
    knownIds.current.add(message.id);
    setMessages((prev) => [...prev, message]);
  }, []);

  const load = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = role === "driver" ? await getDriverChat(bookingId) : await getCustomerChat(bookingId);
      if (res.success) {
        mergeMessages(res.messages || []);
        setCanSend(!!res.canSend);
        setError("");
      } else {
        setError(res.error || "Unable to load chat");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load chat");
    } finally {
      setLoading(false);
    }
  }, [bookingId, mergeMessages, role]);

  useEffect(() => {
    load();
  }, [load]);

  // Short poll fallback while screen is open
  useEffect(() => {
    if (!bookingId) return;
    const t = setInterval(() => {
      load();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [bookingId, load]);

  // SSE for near-realtime delivery
  useEffect(() => {
    if (!bookingId) return;
    let handle: SseStreamHandle | null = null;
    const path =
      role === "driver"
        ? `/driver/rides/${bookingId}/chat/stream`
        : `/customer/reservations/${bookingId}/chat/stream`;

    handle = openSseStream(
      { path },
      {
        onEvent: (event) => {
          if (event.type === "snapshot") {
            try {
              const data = JSON.parse(event.data) as {
                messages?: ChatMessage[];
                canSend?: boolean;
              };
              if (Array.isArray(data.messages)) mergeMessages(data.messages);
              if (typeof data.canSend === "boolean") setCanSend(data.canSend);
            } catch {
              /* ignore */
            }
            return;
          }
          if (event.type === "message") {
            try {
              const data = JSON.parse(event.data) as { message?: ChatMessage; canSend?: boolean };
              if (data.message) appendMessage(data.message);
            } catch {
              /* ignore */
            }
          }
        },
      }
    );

    return () => {
      handle?.close();
    };
  }, [appendMessage, bookingId, mergeMessages, role]);

  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, [messages.length]);

  const onSend = async () => {
    const body = text.trim();
    if (!body || sending || !canSend) return;
    setSending(true);
    setText("");
    try {
      const res =
        role === "driver"
          ? await sendDriverChatMessage(bookingId, body)
          : await sendCustomerChatMessage(bookingId, body);
      if (res.success && res.message) {
        appendMessage(res.message);
        setError("");
      } else {
        setText(body);
        setError(res.error || "Failed to send");
      }
    } catch (e) {
      setText(body);
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const mine = role === "driver" ? "DRIVER" : "CUSTOMER";

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
            <Text style={styles.headerSub}>{bookingId}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={36} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySub}>
                  {canSend
                    ? "Say hello to coordinate pickup."
                    : "Chat opens after the driver accepts the ride."}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMine = item.senderType === mine;
              return (
                <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.body}</Text>
                    <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

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
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!canSend || !text.trim() || sending) && styles.sendBtnDisabled]}
              disabled={!canSend || !text.trim() || sending}
              onPress={onSend}
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
  headerSub: { fontSize: 12, color: "#64748b", marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 14, paddingVertical: 16, flexGrow: 1 },
  empty: { alignItems: "center", paddingTop: 48, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: "600", color: "#334155" },
  emptySub: { marginTop: 6, fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 18 },
  bubbleRow: { marginBottom: 10, flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine: { backgroundColor: "#1C1C1E", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#f1f5f9", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: "#0f172a", lineHeight: 20 },
  bubbleTextMine: { color: "#fff" },
  bubbleTime: { fontSize: 10, color: "#94a3b8", marginTop: 4, alignSelf: "flex-end" },
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
