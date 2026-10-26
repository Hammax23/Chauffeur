import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getDriverReviews,
  type DriverReviewStarBreakdown,
  type DriverTripReviewItem,
} from "../../services/api";
import { useDriverTheme } from "../../contexts/DriverThemeContext";
import { GOLD } from "../../theme/driver-theme";
import { DriverScreenShell } from "../../components/driver/DriverScreenShell";
import { DriverEmptyState } from "../../components/driver/DriverEmptyState";

const EMPTY_BREAKDOWN: DriverReviewStarBreakdown = {
  "1": 0,
  "2": 0,
  "3": 0,
  "4": 0,
  "5": 0,
};

function StarsRow({ stars, size = 14 }: { stars: number; size?: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= stars ? "star" : "star-outline"}
          size={size}
          color={GOLD}
        />
      ))}
    </View>
  );
}

function StarBreakdownBars({
  breakdown,
  total,
  trackColor,
  muted,
}: {
  breakdown: DriverReviewStarBreakdown;
  total: number;
  trackColor: string;
  muted: string;
}) {
  const denom = Math.max(total, 1);
  return (
    <View style={styles.breakdownCol}>
      {([5, 4, 3, 2, 1] as const).map((star) => {
        const n = breakdown[String(star) as keyof DriverReviewStarBreakdown] || 0;
        const pct = Math.min(100, Math.round((n / denom) * 100));
        return (
          <View key={star} style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: muted }]}>{star}</Text>
            <Ionicons name="star" size={10} color={GOLD} />
            <View style={[styles.breakdownTrack, { backgroundColor: trackColor }]}>
              <View
                style={[
                  styles.breakdownFill,
                  { width: `${pct}%`, backgroundColor: GOLD },
                ]}
              />
            </View>
            <Text style={[styles.breakdownCount, { color: muted }]}>{n}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function DriverReviewsScreen() {
  const { palette } = useDriverTheme();
  const surface = palette.cardSurface;

  const [reviews, setReviews] = useState<DriverTripReviewItem[]>([]);
  const [average, setAverage] = useState(5);
  const [count, setCount] = useState(0);
  const [breakdown, setBreakdown] = useState<DriverReviewStarBreakdown>(EMPTY_BREAKDOWN);
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
      setBreakdown(data.breakdown ?? EMPTY_BREAKDOWN);
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
    <DriverScreenShell>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              backgroundColor: palette.softFill,
              borderColor: palette.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={palette.icon} />
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
        <View
          style={[
            styles.summaryCard,
            { borderColor: palette.border, backgroundColor: surface },
          ]}
        >
          <View style={styles.summaryScoreCol}>
            <Text style={[styles.summaryAvg, { color: palette.text }]}>
              {average.toFixed(1)}
            </Text>
            <StarsRow stars={Math.round(average)} size={16} />
            <Text style={[styles.summaryCount, { color: palette.muted }]}>
              {count === 0
                ? "No ratings yet"
                : `${count} rating${count === 1 ? "" : "s"}`}
            </Text>
          </View>
          <StarBreakdownBars
            breakdown={breakdown}
            total={count}
            trackColor={palette.softFill}
            muted={palette.muted}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: palette.muted }]}>Recent ratings</Text>

        {loading ? (
          <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={[styles.emptyText, { color: palette.muted }]}>{error}</Text>
        ) : reviews.length === 0 ? (
          <DriverEmptyState
            icon="star-outline"
            title="No ratings yet"
            subtitle="When customers rate completed trips, their stars appear here."
          />
        ) : (
          reviews.map((r) => (
            <View
              key={r.id}
              style={[
                styles.reviewCard,
                {
                  borderColor: palette.border,
                  backgroundColor: surface,
                },
              ]}
            >
              <View style={styles.reviewTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.tripMeta, { color: palette.muted }]} numberOfLines={1}>
                    {r.bookingId}
                    {r.serviceDate ? ` · ${r.serviceDate}` : ""}
                  </Text>
                </View>
                <StarsRow stars={r.stars} />
              </View>
              <Text style={[styles.routeLine, { color: palette.muted }]} numberOfLines={1}>
                {r.pickupShort} → {r.dropoffShort}
              </Text>
            </View>
          ))
        )}

        {nextCursor ? (
          <Pressable
            style={({ pressed }) => [
              styles.loadMore,
              { borderColor: palette.border },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => void load({ cursor: nextCursor })}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator color={GOLD} />
            ) : (
              <Text style={[styles.loadMoreText, { color: palette.text }]}>Load more</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </DriverScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    marginBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  summaryScoreCol: {
    width: 92,
    alignItems: "center",
  },
  summaryAvg: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  starsRow: { flexDirection: "row", gap: 2, marginTop: 4 },
  summaryCount: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  breakdownCol: {
    flex: 1,
    gap: 5,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  breakdownLabel: {
    width: 10,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
  },
  breakdownTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  breakdownFill: {
    height: "100%",
    borderRadius: 3,
  },
  breakdownCount: {
    width: 18,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  reviewCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  tripMeta: { fontSize: 13, fontWeight: "600", letterSpacing: -0.1 },
  routeLine: { marginTop: 2, fontSize: 12, fontWeight: "500" },
  emptyText: { textAlign: "center", marginTop: 24, fontSize: 14 },
  loadMore: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  loadMoreText: { fontSize: 14, fontWeight: "700" },
});
