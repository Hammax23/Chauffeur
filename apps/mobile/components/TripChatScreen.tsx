import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Platform,
  AppState,
  Animated,
  Pressable,
  Easing,
  Keyboard,
  Vibration,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SlimSpinner } from "./SlimSpinner";
import {
  ChatMessage,
  getCustomerChat,
  getDriverChat,
  markCustomerChatRead,
  markDriverChatRead,
  sendCustomerChatMessage,
  sendDriverChatMessage,
} from "../services/api";
import { openSseStream, type SseConnectionStatus, type SseStreamHandle } from "../services/sse-client";
import { setActiveTripChat } from "../services/active-trip-chat";

const GOLD = "#D4A04A";
const GOLD_DEEP = "#B8893A";
const INK = "#12100E";
const FALLBACK_POLL_MS = 6_000;
const SSE_BOOTSTRAP_MS = 1_800;

const CUSTOMER_SUGGESTIONS = [
  "I'm outside",
  "On my way",
  "Running 5 min late",
  "Where are you?",
  "Thank you",
];

const DRIVER_SUGGESTIONS = [
  "I've arrived",
  "On my way",
  "Looking for you",
  "Slight delay",
  "Please wait",
];

type Role = "driver" | "customer";

type Props = {
  bookingId: string;
  role: Role;
  title?: string;
  peerPhoto?: string;
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

/** Always collapse to one row per message id (guards SSE/HTTP races). */
function uniqueById(list: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of list) {
    if (!m?.id) continue;
    map.set(m.id, m);
  }
  return sortMessages(Array.from(map.values()));
}

function mergeById(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] | null {
  if (incoming.length === 0) return null;
  const map = new Map(prev.map((m) => [m.id, m]));
  let changed = false;
  for (const m of incoming) {
    if (!m?.id) continue;
    if (!map.has(m.id)) {
      changed = true;
      map.set(m.id, m);
    }
  }
  if (!changed) return null;
  return uniqueById(Array.from(map.values()));
}

function replaceMessage(prev: ChatMessage[], tempId: string, next: ChatMessage): ChatMessage[] {
  const withoutTemp = prev.filter((m) => m.id !== tempId && m.id !== next.id);
  return uniqueById([...withoutTemp, next]);
}

type PeerAvatarProps = {
  name: string;
  photo?: string | null;
  size?: number;
};

const PeerAvatar = memo(function PeerAvatar({ name, photo, size = 42 }: PeerAvatarProps) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  if (photo) {
    return (
      <View style={[styles.avatarRing, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }]}>
        <Image
          source={{ uri: photo }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      </View>
    );
  }
  return (
    <View style={[styles.avatarRing, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }]}>
      <LinearGradient
        colors={[GOLD, GOLD_DEEP]}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initial}</Text>
      </LinearGradient>
    </View>
  );
});

type ChatBubbleProps = {
  item: ChatMessage;
  isMine: boolean;
  pending?: boolean;
  animateIn?: boolean;
  peerPhoto?: string | null;
  peerName?: string;
  showAvatar?: boolean;
};

const ChatBubble = memo(function ChatBubble({
  item,
  isMine,
  pending,
  animateIn,
  peerPhoto,
  peerName,
  showAvatar,
}: ChatBubbleProps) {
  const opacity = useRef(new Animated.Value(animateIn ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animateIn ? 10 : 0)).current;

  useEffect(() => {
    if (!animateIn) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animateIn, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        isMine ? styles.bubbleRowMine : styles.bubbleRowOther,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      {!isMine && showAvatar ? (
        <PeerAvatar name={peerName || "D"} photo={peerPhoto} size={28} />
      ) : !isMine ? (
        <View style={{ width: 32 }} />
      ) : null}
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleOther,
          pending && styles.bubblePending,
        ]}
      >
        {isMine ? (
          <LinearGradient
            colors={["#E8C48A", GOLD, GOLD_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bubbleGrad}
          >
            <Text style={[styles.bubbleText, styles.bubbleTextMine]}>{item.body}</Text>
            <View style={styles.bubbleMeta}>
              {pending ? (
                <Text style={[styles.pendingLabel, styles.pendingLabelMine]}>Sending…</Text>
              ) : null}
              <Text style={[styles.bubbleTime, styles.bubbleTimeMine]}>
                {formatTime(item.createdAt)}
              </Text>
              {!pending ? (
                <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.75)" />
              ) : null}
            </View>
          </LinearGradient>
        ) : (
          <>
            <Text style={styles.bubbleText}>{item.body}</Text>
            <View style={styles.bubbleMeta}>
              {pending ? <Text style={styles.pendingLabel}>Sending…</Text> : null}
              <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
});

export default function TripChatScreen({ bookingId, role, title, peerPhoto: peerPhotoProp }: Props) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [canSend, setCanSend] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [connection, setConnection] = useState<SseConnectionStatus>("connecting");
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [peerName, setPeerName] = useState(title?.trim() || (role === "driver" ? "Customer" : "Driver"));
  const [peerPhoto, setPeerPhoto] = useState<string | null>(peerPhotoProp?.trim() || null);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const pendingTempIds = useRef<Set<string>>(new Set());
  const sseReady = useRef(false);
  const lastMessageAt = useRef<string | null>(null);
  const shouldStickToBottom = useRef(true);
  const livePulse = useRef(new Animated.Value(0.4)).current;
  const sendScale = useRef(new Animated.Value(1)).current;
  const screenFade = useRef(new Animated.Value(0)).current;

  const mine = role === "driver" ? "DRIVER" : "CUSTOMER";
  const blurIntensity = Platform.OS === "ios" ? 52 : 30;
  const peerLabel = role === "driver" ? "Customer" : "Your chauffeur";
  const suggestions = role === "driver" ? DRIVER_SUGGESTIONS : CUSTOMER_SUGGESTIONS;

  useEffect(() => {
    if (title?.trim()) setPeerName(title.trim());
  }, [title]);

  useEffect(() => {
    if (peerPhotoProp?.trim()) setPeerPhoto(peerPhotoProp.trim());
  }, [peerPhotoProp]);

  // Suppress OS chat banners while this thread is focused (SSE still delivers).
  useFocusEffect(
    useCallback(() => {
      if (bookingId) setActiveTripChat(bookingId);
      return () => setActiveTripChat(null);
    }, [bookingId])
  );

  useEffect(() => {
    Animated.timing(screenFade, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [screenFade]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      shouldStickToBottom.current = true;
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  useEffect(() => {
    if (connection !== "open") {
      livePulse.stopAnimation();
      livePulse.setValue(0.4);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [connection, livePulse]);

  const markFresh = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setFreshIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
    setTimeout(() => {
      setFreshIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }, 700);
  }, []);

  const applyPeer = useCallback(
    (peer?: { name?: string; photo?: string | null } | null) => {
      if (!peer) return;
      if (peer.name?.trim()) setPeerName(peer.name.trim());
      if (peer.photo?.trim()) setPeerPhoto(peer.photo.trim());
    },
    []
  );

  const applySnapshot = useCallback(
    (
      incoming: ChatMessage[],
      nextCanSend?: boolean,
      peer?: { name?: string; photo?: string | null } | null
    ) => {
      applyPeer(peer);
      setMessages((prev) => {
        const merged = mergeById(prev, incoming);
        const next = uniqueById(merged ?? prev);
        knownIds.current = new Set(next.map((m) => m.id));
        if (next.length > 0) {
          lastMessageAt.current = next[next.length - 1].createdAt;
        }
        if (
          next.length === prev.length &&
          next.every((m, i) => m.id === prev[i]?.id)
        ) {
          return prev;
        }
        return next;
      });
      if (typeof nextCanSend === "boolean") setCanSend(nextCanSend);
      setBootstrapping(false);
      setError("");
    },
    [applyPeer]
  );

  const appendLiveMessage = useCallback(
    (message: ChatMessage) => {
      if (!message?.id) return;
      if (knownIds.current.has(message.id) || pendingTempIds.current.has(message.id)) return;
      knownIds.current.add(message.id);
      lastMessageAt.current = message.createdAt;
      markFresh([message.id]);
      if (message.senderType !== mine) {
        if (Platform.OS === "ios") {
          Vibration.vibrate(40);
        } else {
          Vibration.vibrate(60);
        }
        void (role === "driver"
          ? markDriverChatRead(bookingId)
          : markCustomerChatRead(bookingId));
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return uniqueById([...prev, message]);
      });
    },
    [markFresh, mine, role, bookingId]
  );

  const fetchHttp = useCallback(
    async (incremental = false) => {
      if (!bookingId) return;
      try {
        const since = incremental ? lastMessageAt.current ?? undefined : undefined;
        const res =
          role === "driver"
            ? await getDriverChat(bookingId, since, { markRead: !incremental })
            : await getCustomerChat(bookingId, since, { markRead: !incremental });
        if (res.success) {
          applySnapshot(res.messages || [], !!res.canSend, res.peer);
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

  const [sseEpoch, setSseEpoch] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setSseEpoch((n) => n + 1);
        void fetchHttp(true);
      }
    });
    return () => sub.remove();
  }, [fetchHttp]);

  useEffect(() => {
    if (!bookingId) return;
    void fetchHttp(false);
  }, [bookingId, fetchHttp]);

  useEffect(() => {
    if (!bookingId) return;

    let handle: SseStreamHandle | null = null;
    let bootstrapTimer: ReturnType<typeof setTimeout> | null = null;

    const path =
      role === "driver"
        ? `/driver/rides/${bookingId}/chat/stream`
        : `/customer/reservations/${bookingId}/chat/stream`;

    sseReady.current = false;
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
                peer?: { name?: string; photo?: string | null } | null;
              };
              sseReady.current = true;
              applySnapshot(data.messages || [], data.canSend, data.peer);
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
  }, [appendLiveMessage, applySnapshot, bookingId, fetchHttp, role, sseEpoch]);

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
      listRef.current?.scrollToEnd({ animated: messages.length > 12 });
    });
  }, [messages.length]);

  const sendBody = useCallback(
    async (raw: string) => {
      const body = raw.trim();
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
      markFresh([tempId]);
      setMessages((prev) => uniqueById([...prev, optimistic]));

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
    },
    [bookingId, canSend, markFresh, mine, role, sending]
  );

  const onSend = () => {
    void sendBody(text);
  };

  const connectionLabel = useMemo(() => {
    if (connection === "open") return "Live";
    if (connection === "reconnecting" || connection === "connecting") return "Connecting";
    return "Offline";
  }, [connection]);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isMine = item.senderType === mine;
      const prev = messages[index - 1];
      const showAvatar =
        !isMine && (!prev || prev.senderType === mine || prev.senderType !== item.senderType);
      return (
        <ChatBubble
          item={item}
          isMine={isMine}
          pending={item.id.startsWith("temp-")}
          animateIn={freshIds.has(item.id)}
          peerPhoto={peerPhoto}
          peerName={peerName}
          showAvatar={showAvatar}
        />
      );
    },
    [freshIds, messages, mine, peerName, peerPhoto]
  );

  const keyExtractor = useCallback((item: ChatMessage, index: number) => {
    return item.id ? `${item.id}` : `msg-${index}-${item.createdAt}`;
  }, []);

  const canPressSend = canSend && !!text.trim() && !sending;
  const bottomOffset = keyboardHeight > 0 ? keyboardHeight : 0;
  const composerPadBottom = keyboardHeight > 0 ? 10 : Math.max(insets.bottom, 8);
  const showSuggestions = canSend && !sending && !text.trim();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#EFE8DF", "#F5F2EE", "#FAFAFA"]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Animated.View
          style={[
            styles.flex,
            { opacity: screenFade, paddingBottom: bottomOffset },
          ]}
        >
          <BlurView intensity={blurIntensity} tint="light" style={styles.headerBlur}>
            <View style={styles.header}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.backBtn,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
                ]}
                hitSlop={10}
              >
                <Ionicons name="chevron-back" size={20} color={INK} />
              </Pressable>

              <PeerAvatar name={peerName} photo={peerPhoto} size={42} />

              <View style={styles.headerTextCol}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {peerName}
                </Text>
                <View style={styles.headerMetaRow}>
                  <Text style={styles.headerSub} numberOfLines={1}>
                    {peerLabel}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      connection === "open" ? styles.statusPillLive : styles.statusPillIdle,
                    ]}
                  >
                    {connection === "open" ? (
                      <Animated.View
                        style={[
                          styles.statusPulse,
                          {
                            opacity: livePulse,
                            transform: [
                              {
                                scale: livePulse.interpolate({
                                  inputRange: [0.4, 1],
                                  outputRange: [1, 1.8],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                    ) : null}
                    <View
                      style={[
                        styles.statusDot,
                        connection === "open" ? styles.statusDotLive : styles.statusDotIdle,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        connection === "open" && styles.statusTextLive,
                      ]}
                    >
                      {connectionLabel}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </BlurView>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              messages.length === 0 && styles.listContentEmpty,
            ]}
            initialNumToRender={20}
            maxToRenderPerBatch={16}
            updateCellsBatchingPeriod={40}
            windowSize={9}
            removeClippedSubviews={Platform.OS === "android"}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => {
              shouldStickToBottom.current = false;
            }}
            onMomentumScrollEnd={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              const dist = contentSize.height - layoutMeasurement.height - contentOffset.y;
              shouldStickToBottom.current = dist < 80;
            }}
            onContentSizeChange={() => {
              if (shouldStickToBottom.current) {
                listRef.current?.scrollToEnd({ animated: false });
              }
            }}
            ListEmptyComponent={
              bootstrapping ? (
                <View style={styles.empty}>
                  <SlimSpinner size={26} stroke={2} color={GOLD} />
                  <Text style={styles.emptySub}>Loading conversation…</Text>
                </View>
              ) : (
                <View style={styles.empty}>
                  <View style={styles.emptyHero}>
                    <PeerAvatar name={peerName} photo={peerPhoto} size={72} />
                    <View style={styles.emptyBadge}>
                      <Ionicons name="chatbubble-ellipses" size={14} color="#fff" />
                    </View>
                  </View>
                  <Text style={styles.emptyTitle}>Message {peerName.split(" ")[0]}</Text>
                  <Text style={styles.emptySub}>
                    {canSend
                      ? "Coordinate pickup details instantly."
                      : "Chat opens after the driver accepts the ride."}
                  </Text>
                </View>
              )
            }
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <BlurView intensity={blurIntensity} tint="light" style={styles.composerBlur}>
            <View style={[styles.composer, { paddingBottom: composerPadBottom }]}>
              {!canSend ? (
                <Text style={styles.closedHint}>Chat is read-only for this ride.</Text>
              ) : null}

              {showSuggestions ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {suggestions.map((phrase) => (
                    <Pressable
                      key={phrase}
                      onPress={() => void sendBody(phrase)}
                      style={({ pressed }) => [
                        styles.suggestChip,
                        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <Text style={styles.suggestText}>{phrase}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}

              <View style={styles.inputRow}>
                <View style={styles.inputShell}>
                  <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder={canSend ? "Type a message…" : "Messaging unavailable"}
                    placeholderTextColor="#94A3B8"
                    editable={canSend && !sending}
                    multiline
                    maxLength={2000}
                    returnKeyType="default"
                    blurOnSubmit={false}
                  />
                </View>
                <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                  <Pressable
                    disabled={!canPressSend}
                    onPressIn={() =>
                      Animated.spring(sendScale, {
                        toValue: 0.9,
                        useNativeDriver: true,
                        speed: 40,
                        bounciness: 0,
                      }).start()
                    }
                    onPressOut={() =>
                      Animated.spring(sendScale, {
                        toValue: 1,
                        useNativeDriver: true,
                        speed: 22,
                        bounciness: 6,
                      }).start()
                    }
                    onPress={onSend}
                    style={[styles.sendBtn, !canPressSend && styles.sendBtnDisabled]}
                  >
                    <LinearGradient
                      colors={canPressSend ? [GOLD, GOLD_DEEP] : ["#D1D5DB", "#CBD5E1"]}
                      style={styles.sendGrad}
                    >
                      {sending ? (
                        <SlimSpinner size={18} stroke={2} color="#fff" />
                      ) : (
                        <Ionicons name="arrow-up" size={20} color="#fff" />
                      )}
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </View>
            </View>
          </BlurView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F2EE" },
  safe: { flex: 1 },
  flex: { flex: 1 },
  headerBlur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(18,16,14,0.08)",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(18,16,14,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212,160,74,0.18)",
    ...Platform.select({
      ios: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  avatarText: { color: "#fff", fontWeight: "800" },
  headerTextCol: { flex: 1, minWidth: 0 },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: INK,
    letterSpacing: -0.3,
  },
  headerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  headerSub: { fontSize: 12, color: "#7A746C", flex: 1, fontWeight: "600" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "visible",
  },
  statusPillLive: {
    backgroundColor: "rgba(16,185,129,0.12)",
  },
  statusPillIdle: {
    backgroundColor: "rgba(148,163,184,0.15)",
  },
  statusPulse: {
    position: "absolute",
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotLive: { backgroundColor: "#10B981" },
  statusDotIdle: { backgroundColor: "#94A3B8" },
  statusText: { fontSize: 10, fontWeight: "700", color: "#64748B" },
  statusTextLive: { color: "#059669" },
  listContent: { paddingHorizontal: 14, paddingVertical: 16 },
  listContentEmpty: { flexGrow: 1, justifyContent: "center" },
  empty: { alignItems: "center", paddingHorizontal: 28, paddingVertical: 36 },
  emptyHero: {
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F5F2EE",
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "800",
    color: INK,
    letterSpacing: -0.3,
  },
  emptySub: {
    marginTop: 8,
    fontSize: 13,
    color: "#8A837A",
    textAlign: "center",
    lineHeight: 19,
  },
  bubbleRow: { marginBottom: 10, flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "74%",
    borderRadius: 20,
    overflow: "hidden",
  },
  bubblePending: { opacity: 0.78 },
  bubbleMine: {
    borderBottomRightRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      default: {},
    }),
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(18,16,14,0.06)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  bubbleGrad: {
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  bubbleText: { fontSize: 15.5, color: "#0F172A", lineHeight: 21, letterSpacing: -0.1 },
  bubbleTextMine: { color: "#fff" },
  bubbleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  pendingLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "600" },
  pendingLabelMine: { color: "rgba(255,255,255,0.7)" },
  bubbleTime: { fontSize: 10, color: "#94A3B8", fontWeight: "500" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.7)" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
  errorText: { color: "#DC2626", fontSize: 12, flex: 1, fontWeight: "600" },
  composerBlur: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(18,16,14,0.08)",
    overflow: "hidden",
  },
  composer: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  closedHint: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 8,
    paddingHorizontal: 4,
    fontWeight: "500",
  },
  suggestRow: {
    paddingBottom: 10,
    gap: 8,
    paddingRight: 8,
  },
  suggestChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212,160,74,0.35)",
  },
  suggestText: {
    fontSize: 13,
    fontWeight: "700",
    color: INK,
    letterSpacing: -0.2,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  inputShell: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(18,16,14,0.08)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      default: {},
    }),
  },
  input: {
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 11 : 9,
    fontSize: 16,
    color: INK,
    letterSpacing: -0.2,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
  },
  sendBtnDisabled: { opacity: 0.85 },
  sendGrad: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
