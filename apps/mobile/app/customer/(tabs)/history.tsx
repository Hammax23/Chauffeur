import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  RefreshControl,
  Pressable,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getHistoryReservations,
  type Reservation,
} from "../../../services/api";
import { useCustomerTheme } from "../../../contexts/CustomerThemeContext";
import { SlimSpinner } from "../../../components/SlimSpinner";
import { GOLD } from "../../../theme/driver-theme";
import { isParcelServiceType } from "../../../utils/parcel";

const PAGE_SIZE = 20;

type StatusFilter = "ALL" | "DONE" | "CANCELLED";

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  return s.split(",")[0]?.trim() || s.trim();
}

function formatHistoryWhen(serviceDate: string, serviceTime: string): string {
  const time = (serviceTime || "").trim() || "—";
  const raw = (serviceDate || "").trim();
  if (!raw) return time;

  const parsed = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return `${raw} · ${time}`;
  }

  const weekday = parsed.toLocaleDateString(undefined, { weekday: "short" });
  const day = parsed.getDate();
  const month = parsed.toLocaleDateString(undefined, { month: "short" });
  return `${weekday}, ${day} ${month} · ${time}`;
}

function dropoffLine(r: Reservation): string {
  if (isParcelServiceType(r.serviceType)) {
    return shortLoc(r.dropoffLocation);
  }
  const drop = (r.dropoffLocation || "").trim();
  const dur = (r.duration || "").trim();
  const hourly =
    /hour/i.test(dur) ||
    /hourly/i.test(r.serviceType || "") ||
    /^as directed$/i.test(drop);
  if (hourly) {
    const hours = dur.match(/(\d+)\s*h/i)?.[1] || dur.match(/(\d+)/)?.[1];
    return hours ? `By the hour · ${hours} hrs` : "By the hour";
  }
  return shortLoc(drop || "—");
}

function openTripDetail(bookingId: string) {
  router.push({
    pathname: "/customer/trip-detail",
    params: { bookingId },
  });
}

function HistoryCard({
  reservation,
  palette,
  isDark,
}: {
  reservation: Reservation;
  palette: ReturnType<typeof useCustomerTheme>["palette"];
  isDark: boolean;
}) {
  const isDone = reservation.status === "DONE";
  const isCancelled =
    reservation.status === "CANCELLED" || reservation.status === "CANCELED";
  const stars = reservation.review?.stars ?? 0;
  const total = Number(reservation.total || 0);
  const priceLabel =
    isCancelled && total <= 0 ? "No charge" : `$${total.toFixed(2)}`;

  const onRebook = () => {
    router.push({
      pathname: "/customer/create-reservation",
      params: {
        pickup: reservation.pickupLocation || "",
        dropoff: reservation.dropoffLocation || "",
      },
    });
  };

  const onReceipt = () => {
    openTripDetail(reservation.bookingId);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isDark
            ? "rgba(28,28,30,0.92)"
            : "rgba(255,255,255,0.92)",
          borderColor: palette.border,
        },
        pressed && styles.pressed,
      ]}
      onPress={() => openTripDetail(reservation.bookingId)}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.whenText, { color: palette.text }]} numberOfLines={1}>
          {formatHistoryWhen(reservation.serviceDate, reservation.serviceTime)}
        </Text>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isDone
                ? isDark
                  ? "rgba(52,199,89,0.16)"
                  : "rgba(22,163,74,0.12)"
                : isDark
                  ? "rgba(255,69,58,0.14)"
                  : "rgba(220,38,38,0.1)",
              borderColor: isDone
                ? isDark
                  ? "rgba(52,199,89,0.35)"
                  : "rgba(22,163,74,0.28)"
                : isDark
                  ? "rgba(255,69,58,0.35)"
                  : "rgba(220,38,38,0.28)",
            },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              {
                color: isDone
                  ? isDark
                    ? "#34C759"
                    : "#15803D"
                  : isDark
                    ? "#FF453A"
                    : "#DC2626",
              },
            ]}
          >
            {isDone ? "Completed" : "Cancelled"}
          </Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <View style={[styles.routeDot, { backgroundColor: isDark ? "#F5F5F7" : "#1C1C1E" }]} />
        <Text style={[styles.routeText, { color: palette.location }]} numberOfLines={1}>
          {shortLoc(reservation.pickupLocation)}
        </Text>
        <Text style={[styles.routeArrow, { color: palette.muted }]}>→</Text>
        <Text style={[styles.routeText, { color: palette.location, flex: 1 }]} numberOfLines={1}>
          {dropoffLine(reservation)}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: palette.border }]} />

      <View style={styles.cardFooter}>
        <View style={styles.metaCol}>
          <Text style={[styles.metaLine, { color: palette.muted }]} numberOfLines={1}>
            {reservation.vehicle || "Vehicle"}
            <Text style={{ color: isDark ? GOLD : palette.hintBold }}>
              {" "}
              · {priceLabel}
            </Text>
          </Text>
          {isDone && reservation.review ? (
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= stars ? "star" : "star-outline"}
                  size={12}
                  color={n <= stars ? GOLD : palette.muted}
                />
              ))}
              <Text style={[styles.ratingCopy, { color: palette.muted }]}>
                You rated {stars}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onReceipt();
            }}
            style={({ pressed }) => [
              styles.receiptBtn,
              {
                borderColor: palette.border,
                backgroundColor: palette.metaChipBg,
              },
              pressed && styles.pressed,
            ]}
            hitSlop={4}
          >
            <Text style={[styles.receiptBtnText, { color: palette.text }]}>Receipt</Text>
          </Pressable>

          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onRebook();
            }}
            style={({ pressed }) => [styles.rebookBtn, pressed && styles.pressed]}
            hitSlop={4}
          >
            <LinearGradient
              colors={["#E8C078", GOLD, "#B8862E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rebookGradient}
            >
              <Text style={styles.rebookBtnText}>Rebook</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const { palette, isDark } = useCustomerTheme();

  const [items, setItems] = useState<Reservation[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const fetchGen = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (pageNum: number, mode: "replace" | "append") => {
      const gen = ++fetchGen.current;
      try {
        if (mode === "replace") setLoadError(null);
        const data = await getHistoryReservations({
          page: pageNum,
          limit: PAGE_SIZE,
          q: debouncedQ || undefined,
          status: statusFilter,
        });
        if (gen !== fetchGen.current) return;

        if (!data.success) {
          setLoadError("Could not load history.");
          return;
        }

        const next = data.reservations || [];
        setItems((prev) => (mode === "append" ? [...prev, ...next] : next));
        setPage(pageNum);
        setHasMore(Boolean(data.pagination?.hasMore));
        setTotal(data.pagination?.total ?? next.length);
      } catch (e) {
        if (gen !== fetchGen.current) return;
        setLoadError(e instanceof Error ? e.message : "Could not load history.");
      } finally {
        if (gen === fetchGen.current) {
          setIsLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedQ, statusFilter]
  );

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void fetchPage(1, "replace");
    }, [fetchPage])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void fetchPage(1, "replace");
  };

  const onEndReached = () => {
    if (isLoading || loadingMore || refreshing || !hasMore) return;
    setLoadingMore(true);
    void fetchPage(page + 1, "append");
  };

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "DONE", label: "Completed" },
    { id: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
      <View style={styles.ambientGlow} pointerEvents="none">
        <LinearGradient
          colors={[...palette.glow]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.85, y: 0.5 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Text
            style={[
              styles.headerEyebrow,
              { color: isDark ? GOLD : palette.hintBold },
            ]}
          >
            PAST TRIPS
          </Text>
          <Text style={[styles.headerTitle, { color: palette.text }]}>History</Text>
          {!isLoading && total > 0 ? (
            <Text style={[styles.headerSub, { color: palette.muted }]}>
              {total} trip{total === 1 ? "" : "s"}
              {debouncedQ ? ` matching “${debouncedQ}”` : ""}
            </Text>
          ) : null}
        </View>

        <View style={styles.controls}>
          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: isDark
                  ? "rgba(28,28,30,0.85)"
                  : "rgba(255,255,255,0.85)",
                borderColor: palette.border,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={palette.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search booking, place, vehicle…"
              placeholderTextColor={palette.muted}
              style={[styles.searchInput, { color: palette.text }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
            {search.length > 0 && Platform.OS === "android" ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={palette.muted} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.filterRow}>
            {filters.map((f) => {
              const active = statusFilter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setStatusFilter(f.id)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    {
                      backgroundColor: active
                        ? GOLD
                        : isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.045)",
                      borderColor: active ? GOLD : palette.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: active ? "#1A1208" : palette.metaText },
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.emptyState}>
            <SlimSpinner size={32} stroke={2} color={GOLD} />
          </View>
        ) : loadError ? (
          <View style={styles.padded}>
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: palette.cardAndroid, borderColor: palette.border },
              ]}
            >
              <View style={styles.emptyIconWrap}>
                <Ionicons name="cloud-offline-outline" size={26} color={GOLD} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>{loadError}</Text>
              <Pressable
                style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
                onPress={() => {
                  setIsLoading(true);
                  void fetchPage(1, "replace");
                }}
              >
                <LinearGradient
                  colors={["#E8C078", GOLD, "#B8862E"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.retryGradient}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={GOLD}
                colors={[GOLD]}
              />
            }
            onEndReached={onEndReached}
            onEndReachedThreshold={0.35}
            ListEmptyComponent={
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: palette.cardAndroid, borderColor: palette.border },
                ]}
              >
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="time-outline" size={26} color={GOLD} />
                </View>
                <Text style={[styles.emptyTitle, { color: palette.text }]}>
                  {debouncedQ ? "No matches" : "No ride history"}
                </Text>
                <Text style={[styles.emptySubtext, { color: palette.muted }]}>
                  {debouncedQ
                    ? "Try a different search or filter."
                    : "Completed rides will appear here."}
                </Text>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <SlimSpinner size={22} stroke={2} color={GOLD} />
                  <Text style={[styles.footerLoaderText, { color: palette.muted }]}>
                    Loading more…
                  </Text>
                </View>
              ) : hasMore ? (
                <Text style={[styles.endHint, { color: palette.muted }]}>Scroll for more</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <HistoryCard
                reservation={item}
                palette={palette}
                isDark={isDark}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  ambientGlow: {
    position: "absolute",
    top: -40,
    left: -20,
    right: -20,
    height: 240,
  },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    marginTop: 4,
  },
  controls: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    gap: 10,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 11 : 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: Platform.OS === "ios" ? 0 : 8,
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterText: { fontSize: 13, fontWeight: "700" },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    flexGrow: 1,
  },
  padded: { paddingHorizontal: 16 },
  card: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
    }),
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  whenText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
    minWidth: 0,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  routeText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.15,
    flexShrink: 1,
  },
  routeArrow: {
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  metaCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  metaLine: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexWrap: "wrap",
  },
  ratingCopy: {
    fontSize: 11,
    fontWeight: "500",
    marginLeft: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  receiptBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptBtnText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  rebookBtn: {
    borderRadius: 10,
    overflow: "hidden",
    minHeight: 36,
  },
  rebookGradient: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  rebookBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1A1208",
    letterSpacing: -0.1,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyCard: {
    alignItems: "center",
    marginTop: 24,
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(212,160,74,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
  },
  retryGradient: {
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A1208",
  },
  footerLoader: {
    paddingVertical: 18,
    alignItems: "center",
    gap: 8,
  },
  footerLoaderText: { fontSize: 12, fontWeight: "500" },
  endHint: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    paddingVertical: 16,
  },
  pressed: {
    opacity: 0.86,
  },
});
