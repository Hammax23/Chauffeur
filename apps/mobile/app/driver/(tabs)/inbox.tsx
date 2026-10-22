import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getDriverChatThreads,
  type DriverChatThreadRow,
} from "../../../services/api";
import { useDriverTheme } from "../../../contexts/DriverThemeContext";
import { GOLD } from "../../../theme/driver-theme";
import { SlimSpinner } from "../../../components/SlimSpinner";
import { DriverScreenShell } from "../../../components/driver/DriverScreenShell";
import { DriverEmptyState } from "../../../components/driver/DriverEmptyState";

/** Match footer content height in `(tabs)/_layout`. */
const TAB_BAR_CONTENT_H = 46;

function formatThreadTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function InboxRow({
  thread,
  text,
  muted,
  surface,
  border,
  soft,
}: {
  thread: DriverChatThreadRow;
  text: string;
  muted: string;
  surface: string;
  border: string;
  soft: string;
}) {
  const unread = thread.unreadCount > 0;
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/driver/chat",
          params: {
            bookingId: thread.bookingId,
            name: thread.peer.name,
            photo: thread.peer.photo || "",
          },
        })
      }
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: surface, borderColor: border },
        pressed && { opacity: 0.85 },
      ]}
    >
      {thread.peer.photo ? (
        <Image source={{ uri: thread.peer.photo }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: soft }]}>
          <Ionicons name="person" size={18} color={GOLD} />
        </View>
      )}

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: text }, unread && styles.nameUnread]} numberOfLines={1}>
            {thread.peer.name}
          </Text>
          <Text style={[styles.time, { color: muted }]}>
            {formatThreadTime(thread.lastMessage?.createdAt)}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text
            style={[styles.preview, { color: muted }, unread && { color: text, fontWeight: "600" }]}
            numberOfLines={1}
          >
            {thread.lastMessage?.body || "No messages yet"}
          </Text>
          {unread ? (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadText}>
                {thread.unreadCount > 99 ? "99+" : String(thread.unreadCount)}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.meta, { color: muted }]} numberOfLines={1}>
          {thread.serviceDate} · {thread.serviceTime} · {thread.status}
        </Text>
      </View>
    </Pressable>
  );
}

export default function DriverInboxScreen() {
  const { palette } = useDriverTheme();
  const insets = useSafeAreaInsets();
  const [threads, setThreads] = useState<DriverChatThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    try {
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await getDriverChatThreads();
      if (!data.success) {
        setError(data.error || "Could not load inbox.");
        return;
      }
      setThreads(data.threads || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load inbox.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const bottomClear = TAB_BAR_CONTENT_H + Math.max(insets.bottom - 4, 4) + 24;

  return (
    <DriverScreenShell>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>Inbox</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <SlimSpinner size={32} stroke={2} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomClear },
            threads.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load({ refresh: true })}
              tintColor={GOLD}
              colors={[GOLD]}
            />
          }
        >
          {error ? (
            <Text style={[styles.error, { color: palette.muted }]}>{error}</Text>
          ) : threads.length === 0 ? (
            <DriverEmptyState
              icon="chatbubble-ellipses-outline"
              title="No messages yet"
              subtitle="When a guest messages you on an accepted trip, it will show up here."
            />
          ) : (
            threads.map((thread) => (
              <InboxRow
                key={thread.bookingId}
                thread={thread}
                text={palette.text}
                muted={palette.muted}
                surface={palette.cardSurface}
                border={palette.border}
                soft={palette.softFill}
              />
            ))
          )}
        </ScrollView>
      )}
    </DriverScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 18 },
  listEmpty: { flexGrow: 1, justifyContent: "center" },
  error: { textAlign: "center", marginTop: 40, fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  nameUnread: {
    fontWeight: "800",
  },
  time: {
    fontSize: 11,
    fontWeight: "600",
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  preview: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  unreadPill: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: "#111",
    fontSize: 11,
    fontWeight: "800",
  },
  meta: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "500",
  },
});
