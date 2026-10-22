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
  type DriverTripReviewItem,
} from "../../services/api";
import { useDriverTheme } from "../../contexts/DriverThemeContext";
import { GOLD } from "../../theme/driver-theme";
import { DriverScreenShell } from "../../components/driver/DriverScreenShell";
import { DriverEmptyState } from "../../components/driver/DriverEmptyState";

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
  const surface = palette.cardSurface;

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
          <View style={[styles.summaryIcon, { backgroundColor: palette.metaChipBg }]}>
            <Ionicons name="star" size={26} color={GOLD} />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: palette.muted }]}>From customers</Text>

        {loading ? (
          <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={[styles.emptyText, { color: palette.muted }]}>{error}</Text>
        ) : reviews.length === 0 ? (
          <DriverEmptyState
            icon="star-outline"
            title="No reviews yet"
            subtitle="When customers rate completed trips, their feedback appears here."
          />
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
              style={({ pressed }) => [
                styles.reviewCard,
                {
                  borderColor: palette.border,
                  backgroundColor: surface,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={styles.reviewTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
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
            </Pressable>
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
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 18,
  },
  summaryLeft: { flex: 1 },
  summaryAvg: { fontSize: 40, fontWeight: "800", letterSpacing: -1.2 },
  starsRow: { flexDirection: "row", gap: 3, marginTop: 6 },
  summaryCount: { marginTop: 8, fontSize: 13, fontWeight: "500" },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  customerName: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },
  tripMeta: { fontSize: 12, marginTop: 2, fontWeight: "500" },
  comment: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  commentMuted: { fontSize: 13, fontStyle: "italic" },
  routeLine: { marginTop: 10, fontSize: 12, fontWeight: "500" },
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
