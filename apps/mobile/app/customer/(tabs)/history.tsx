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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getHistoryReservations, hideReservationFromHistory, type Reservation } from "../../../services/api";
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

function HistoryCard({
  reservation,
  palette,
  cardBlur,
  removing,
  onRemove,
}: {
  reservation: Reservation;
  palette: ReturnType<typeof useCustomerTheme>["palette"];
  cardBlur: number;
  removing?: boolean;
  onRemove: (bookingId: string) => void;
}) {
  const isDone = reservation.status === "DONE";
  return (
    <Pressable
      style={({ pressed }) => [styles.cardWrap, pressed && styles.pressed]}
      onPress={() =>
        router.push({
          pathname: "/customer/trip-detail",
          params: { bookingId: reservation.bookingId },
        })
      }
      disabled={removing}
    >
      <BlurView
        intensity={cardBlur}
        tint={palette.blurTint}
        style={[
          styles.card,
          {
            borderColor: palette.border,
            backgroundColor: Platform.OS === "android" ? palette.cardAndroid : "transparent",
            opacity: removing ? 0.55 : 1,
          },
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.bookingId}>{reservation.bookingId}</Text>
          <View style={styles.topActions}>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: isDone ? "rgba(52,199,89,0.14)" : "rgba(255,69,58,0.12)",
                  borderColor: isDone ? "rgba(52,199,89,0.4)" : "rgba(255,69,58,0.35)",
                },
              ]}
            >
              <Text style={[styles.statusText, { color: isDone ? "#34C759" : "#FF453A" }]}>
                {isDone ? "COMPLETED" : "CANCELLED"}
              </Text>
            </View>
            <Pressable
              hitSlop={10}
              onPress={() => onRemove(reservation.bookingId)}
              style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.7 }]}
              accessibilityLabel="Remove from History"
            >
              {removing ? (
                <SlimSpinner size={16} stroke={2} color="#FF453A" />
              ) : (
                <Ionicons name="trash-outline" size={18} color="#FF453A" />
              )}
            </Pressable>
          </View>
        </View>

        {reservation.vehicle ? (
          <Text style={[styles.vehicleName, { color: palette.text }]} numberOfLines={1}>
            {reservation.vehicle}
          </Text>
        ) : null}

        <View style={styles.chipRow}>
          <View
            style={[
              styles.metaChip,
              { backgroundColor: palette.metaChipBg, borderColor: palette.border },
            ]}
          >
            <Ionicons name="calendar-outline" size={13} color={GOLD} />
            <Text style={[styles.metaChipText, { color: palette.metaText }]}>
              {reservation.serviceDate} · {reservation.serviceTime}
            </Text>
          </View>
          <View
            style={[
              styles.metaChip,
              { backgroundColor: palette.metaChipBg, borderColor: palette.border },
            ]}
          >
            <Ionicons
              name={isParcelServiceType(reservation.serviceType) ? "cube-outline" : "people-outline"}
              size={13}
              color={GOLD}
            />
            <Text style={[styles.metaChipText, { color: palette.metaText }]}>
              {isParcelServiceType(reservation.serviceType)
                ? "Parcel"
                : `${reservation.passengers} pax`}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.routeCard,
            { backgroundColor: palette.routeBg, borderColor: palette.border },
          ]}
        >
          <View style={styles.routeRail}>
            <View style={[styles.routeDot, { backgroundColor: "#34C759" }]} />
            <View style={[styles.routeLine, { backgroundColor: palette.routeLine }]} />
            <View style={[styles.routeDot, { backgroundColor: "#FF453A" }]} />
          </View>
          <View style={styles.routeCopy}>
            <View style={styles.routeBlock}>
              <Text style={[styles.routeLabel, { color: palette.muted }]}>PICKUP</Text>
              <Text style={[styles.locationText, { color: palette.location }]} numberOfLines={2}>
                {shortLoc(reservation.pickupLocation)}
              </Text>
            </View>
            <View style={styles.routeBlock}>
              <Text style={[styles.routeLabel, { color: palette.muted }]}>DROPOFF</Text>
              <Text style={[styles.locationText, { color: palette.location }]} numberOfLines={2}>
                {shortLoc(reservation.dropoffLocation)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.totalText}>${Number(reservation.total || 0).toFixed(2)} CAD</Text>
          <View style={styles.ctaRow}>
            <Text style={[styles.ctaText, { color: palette.text }]}>View</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.icon} />
          </View>
        </View>
      </BlurView>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const { palette } = useCustomerTheme();
  const cardBlur = Platform.OS === "ios" ? 36 : 22;

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
  const [removingId, setRemovingId] = useState<string | null>(null);
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

  const confirmRemove = useCallback((bookingId: string) => {
    Alert.alert(
      "Remove from History?",
      "This hides the trip from your History list only. It does not delete the booking from SARJ records (needed for receipts, billing, and support).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setRemovingId(bookingId);
              try {
                const res = await hideReservationFromHistory(bookingId);
                if (!res.ok || !res.data.success) {
                  Alert.alert(
                    "Unable to remove",
                    res.data.error || "Please try again."
                  );
                  return;
                }
                setItems((prev) => prev.filter((r) => r.bookingId !== bookingId));
                setTotal((t) => Math.max(0, t - 1));
              } catch (e) {
                Alert.alert(
                  "Unable to remove",
                  e instanceof Error ? e.message : "Please try again."
                );
              } finally {
                setRemovingId(null);
              }
            })();
          },
        },
      ]
    );
  }, []);

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
          <Text style={styles.headerEyebrow}>PAST TRIPS</Text>
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
                backgroundColor: Platform.OS === "android" ? palette.cardAndroid : "rgba(255,255,255,0.55)",
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
                      backgroundColor: active ? GOLD : "rgba(255,255,255,0.45)",
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
            <BlurView
              intensity={cardBlur}
              tint={palette.blurTint}
              style={[styles.emptyCard, { borderColor: palette.border }]}
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
            </BlurView>
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
              <BlurView
                intensity={cardBlur}
                tint={palette.blurTint}
                style={[styles.emptyCard, { borderColor: palette.border }]}
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
              </BlurView>
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
                cardBlur={cardBlur}
                removing={removingId === item.bookingId}
                onRemove={confirmRemove}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
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
    color: GOLD,
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
    paddingHorizontal: 18,
    paddingBottom: 110,
    flexGrow: 1,
  },
  padded: { paddingHorizontal: 18 },
  cardWrap: {
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
      },
      android: { elevation: 5 },
    }),
  },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  bookingId: {
    flex: 1,
    fontSize: 13,
    color: GOLD,
    fontWeight: "700",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,69,58,0.1)",
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  vehicleName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  routeCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  routeRail: {
    width: 14,
    alignItems: "center",
    paddingVertical: 4,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
    borderRadius: 1,
  },
  routeCopy: { flex: 1, gap: 12 },
  routeBlock: { gap: 3 },
  routeLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19,
  },
  footerRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalText: {
    fontSize: 15,
    fontWeight: "800",
    color: GOLD,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "700",
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
    borderRadius: 22,
    overflow: "hidden",
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
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
