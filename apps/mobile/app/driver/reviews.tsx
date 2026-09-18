import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getDriverReviews,
  type DriverTripReviewItem,
} from "../../services/api";
import { useDriverTheme } from "../../contexts/DriverThemeContext";
import { GOLD } from "../../theme/driver-theme";

function StarsRow({ stars }: { stars: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= stars ? "star" : "star-outline"}
          size={14}
          color={GOLD}
        />
      ))}
    </View>
  );
}

export default function DriverReviewsScreen() {
  const { palette } = useDriverTheme();
  const blurIntensity = Platform.OS === "ios" ? 48 : 28;
  const cardBlur = Platform.OS === "ios" ? 36 : 22;

  const [reviews, setReviews] = useState<DriverTripReviewItem[]>([]);
  const [average, setAverage] = useState(5);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (opts?: { refresh?: boolean; cursor?: string }) => {
    try {
      if (opts?.refresh) setRefreshing(true);
      else if (!opts?.cursor) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      const data = await getDriverReviews({
        limit: 30,
        cursor: opts?.cursor,
      });
      if (!data.success) {
        setError(data.error || "Could not load reviews.");
        return;
      }
      setAverage(data.average ?? 5);
      setCount(data.count ?? 0);
      setNextCursor(data.nextCursor ?? null);
      setReviews((prev) =>
        opts?.cursor ? [...prev, ...(data.reviews || [])] : data.reviews || []
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reviews.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backWrap, pressed && styles.pressed]}
          >
            <BlurView
              intensity={blurIntensity}
              tint={palette.blurTint}
              style={[styles.backBtn, { borderColor: palette.glassBorder }]}
            >
              <Ionicons name="chevron-back" size={22} color={palette.icon} />
            </BlurView>
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Reviews</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load({ refresh: true })}
              tintColor={GOLD}
            />
          }
        >
          <BlurView
            intensity={cardBlur}
            tint={palette.blurTint}
            style={[
              styles.summaryCard,
              {
                borderColor: palette.border,
                backgroundColor: Platform.OS === "android" ? palette.cardAndroid : "transparent",
              },
            ]}
          >
            <View style={styles.summaryLeft}>
              <Text style={[styles.summaryAvg, { color: palette.text }]}>
                {average.toFixed(1)}
              </Text>
              <StarsRow stars={Math.round(average)} />
              <Text style={[styles.summaryCount, { color: palette.muted }]}>
                {count === 0
                  ? "No reviews yet"
                  : `${count} review${count === 1 ? "" : "s"}`}
              </Text>
            </View>
            <View style={styles.summaryIcon}>
              <Ionicons name="star" size={28} color={GOLD} />
            </View>
          </BlurView>

          <Text style={[styles.sectionEyebrow, { color: GOLD }]}>FROM CUSTOMERS</Text>

          {loading ? (
            <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />
          ) : error ? (
            <Text style={[styles.emptyText, { color: palette.muted }]}>{error}</Text>
          ) : reviews.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.muted }]}>
              When customers rate completed trips, their feedback appears here.
            </Text>
          ) : (
            reviews.map((r) => (
              <Pressable
                key={r.id}
                onPress={() =>
                  router.push({
                    pathname: "/driver/ride-details",
                    params: { bookingId: r.bookingId },
                  })
                }
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <BlurView
                  intensity={cardBlur}
                  tint={palette.blurTint}
                  style={[
                    styles.reviewCard,
                    {
                      borderColor: palette.border,
                      backgroundColor:
                        Platform.OS === "android" ? palette.cardAndroid : "transparent",
                    },
                  ]}
                >
                  <View style={styles.reviewTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.customerName, { color: palette.text }]}>
                        {r.customerName}
                      </Text>
                      <Text style={[styles.tripMeta, { color: palette.muted }]} numberOfLines={1}>
                        {r.bookingId}
                        {r.serviceDate ? ` · ${r.serviceDate}` : ""}
                      </Text>
                    </View>
                    <StarsRow stars={r.stars} />
                  </View>
                  {r.comment ? (
                    <Text style={[styles.comment, { color: palette.text }]}>{r.comment}</Text>
                  ) : (
                    <Text style={[styles.commentMuted, { color: palette.muted }]}>
                      No written comment
                    </Text>
                  )}
                  <Text style={[styles.routeLine, { color: palette.muted }]} numberOfLines={1}>
                    {r.pickupShort} → {r.dropoffShort}
                  </Text>
                </BlurView>
              </Pressable>
            ))
          )}

          {nextCursor ? (
            <Pressable
              style={({ pressed }) => [styles.loadMore, pressed && styles.pressed]}
              onPress={() => void load({ cursor: nextCursor })}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator color={GOLD} />
              ) : (
                <Text style={styles.loadMoreText}>Load more</Text>
              )}
            </Pressable>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backWrap: { borderRadius: 20, overflow: "hidden" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  pressed: { opacity: 0.85 },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 22,
    overflow: "hidden",
  },
  summaryLeft: { flex: 1, gap: 6 },
  summaryAvg: { fontSize: 40, fontWeight: "800", letterSpacing: -1 },
  summaryCount: { fontSize: 13, fontWeight: "500" },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(201,160,99,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  starsRow: { flexDirection: "row", gap: 3 },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  reviewCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  customerName: { fontSize: 15, fontWeight: "700" },
  tripMeta: { fontSize: 12, marginTop: 2 },
  comment: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  commentMuted: { fontSize: 13, fontStyle: "italic", marginBottom: 8 },
  routeLine: { fontSize: 12 },
  emptyText: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  loadMore: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  loadMoreText: {
    color: GOLD,
    fontWeight: "700",
    fontSize: 14,
  },
});
