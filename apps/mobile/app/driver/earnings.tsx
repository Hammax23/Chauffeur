import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getDriverEarnings,
  type DriverEarningRow,
  type DriverEarningSummary,
  type DriverRemittanceRow,
} from "../../services/api";
import { SlimSpinner } from "../../components/SlimSpinner";
import { GOLD } from "../../theme/driver-theme";
import { DriverScreenShell } from "../../components/driver/DriverScreenShell";
import { useDriverTheme } from "../../contexts/DriverThemeContext";

type ListItem =
  | { kind: "summary"; summary: DriverEarningSummary }
  | { kind: "section"; label: string; hint?: string }
  | { kind: "earning"; row: DriverEarningRow }
  | { kind: "remittance"; row: DriverRemittanceRow }
  | { kind: "empty"; label: string };

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  return s.split(",")[0]?.trim() || s.trim();
}

function statusColors(
  status: string
): { bg: string; fg: string; label: string } {
  switch (status) {
    case "PAID":
      return { bg: "rgba(52,199,89,0.14)", fg: "#34C759", label: "Paid" };
    case "HELD":
      return { bg: "rgba(255,159,10,0.16)", fg: "#FF9F0A", label: "On hold" };
    case "VOID":
      return { bg: "rgba(142,142,147,0.16)", fg: "#8A8A8E", label: "Void" };
    case "REASSIGNED":
      return { bg: "rgba(142,142,147,0.16)", fg: "#8A8A8E", label: "Reassigned" };
    case "PENDING":
    default:
      return { bg: "rgba(212,160,74,0.18)", fg: GOLD, label: "Owed to you" };
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function DriverEarningsListScreen() {
  const { palette, isDark } = useDriverTheme();
  const [summary, setSummary] = useState<DriverEarningSummary | null>(null);
  const [earnings, setEarnings] = useState<DriverEarningRow[]>([]);
  const [remittances, setRemittances] = useState<DriverRemittanceRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardBg = isDark ? palette.softFill : palette.cardSurface;

  const load = useCallback(
    async (opts?: { refresh?: boolean; cursor?: string; append?: boolean }) => {
      try {
        if (opts?.append) setLoadingMore(true);
        else if (opts?.refresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res = await getDriverEarnings({ limit: 30, cursor: opts?.cursor });
        if (!res.success) {
          setError(res.error || "Could not load earnings");
          return;
        }
        setSummary(res.summary);
        setRemittances(res.remittances || []);
        setNextCursor(res.nextCursor);
        setEarnings((prev) =>
          opts?.append ? [...prev, ...(res.earnings || [])] : res.earnings || []
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load earnings");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const items: ListItem[] = [];
  if (summary) items.push({ kind: "summary", summary });

  const owedRemits = remittances.filter((r) => r.status === "OWED");
  if (owedRemits.length > 0) {
    items.push({
      kind: "section",
      label: "COD you owe company",
      hint: "Hand to admin on your next shift",
    });
    for (const r of owedRemits) items.push({ kind: "remittance", row: r });
  }

  items.push({
    kind: "section",
    label: "Trip earnings",
    hint: earnings.length > 0 ? `${earnings.length} shown` : undefined,
  });
  if (earnings.length === 0) {
    items.push({ kind: "empty", label: "No earnings yet — ledger populates as you complete trips." });
  } else {
    for (const e of earnings) items.push({ kind: "earning", row: e });
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === "summary") {
      const s = item.summary;
      return (
        <View style={styles.summaryGroup}>
          <View
            style={[
              styles.weekCard,
              { backgroundColor: cardBg, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.weekLabel, { color: palette.muted }]}>
              This week · Toronto
            </Text>
            <Text style={[styles.weekValue, { color: palette.text }]}>
              ${s.thisWeek.total.toFixed(2)}
            </Text>
            <Text style={[styles.weekHint, { color: palette.muted }]}>
              {s.thisWeek.count} trip{s.thisWeek.count === 1 ? "" : "s"} · lifetime $
              {s.lifetime.total.toFixed(2)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <StatTile
              label="Owed to you"
              value={`$${s.pending.total.toFixed(2)}`}
              hint={`${s.pending.count} pending`}
              valueColor={GOLD}
              bg={cardBg}
              border={palette.border}
              labelColor={palette.muted}
              hintColor={palette.muted}
            />
            <StatTile
              label="Paid"
              value={`$${s.paid.total.toFixed(2)}`}
              hint={`${s.paid.count} rows`}
              valueColor="#34C759"
              bg={cardBg}
              border={palette.border}
              labelColor={palette.muted}
              hintColor={palette.muted}
            />
          </View>

          <View style={styles.statRow}>
            <StatTile
              label="On hold"
              value={`$${s.held.total.toFixed(2)}`}
              hint={`${s.held.count} rows`}
              valueColor="#FF9F0A"
              bg={cardBg}
              border={palette.border}
              labelColor={palette.muted}
              hintColor={palette.muted}
            />
            <StatTile
              label="Adjustments"
              value={
                s.adjustments
                  ? `${s.adjustments.net >= 0 ? "+" : "−"}$${Math.abs(s.adjustments.net).toFixed(2)}`
                  : "$0.00"
              }
              hint={
                s.adjustments
                  ? `${s.adjustments.positiveCount} bonus · ${s.adjustments.negativeCount} ded.`
                  : "None applied"
              }
              valueColor={
                s.adjustments && s.adjustments.net < 0 ? "#FF453A" : palette.text
              }
              bg={cardBg}
              border={palette.border}
              labelColor={palette.muted}
              hintColor={palette.muted}
            />
          </View>
        </View>
      );
    }

    if (item.kind === "section") {
      return (
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{item.label}</Text>
          {item.hint ? (
            <Text style={[styles.sectionHint, { color: palette.muted }]}>{item.hint}</Text>
          ) : null}
        </View>
      );
    }

    if (item.kind === "empty") {
      return (
        <Text style={[styles.empty, { color: palette.muted }]}>{item.label}</Text>
      );
    }

    if (item.kind === "remittance") {
      const r = item.row;
      return (
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor: palette.border },
          ]}
        >
          <View style={styles.cardTopRow}>
            <Text style={styles.code}>{r.bookingId}</Text>
            <View style={[styles.statusChip, { backgroundColor: "rgba(255,159,10,0.16)" }]}>
              <Text style={[styles.statusChipText, { color: "#FF9F0A" }]}>COD owed</Text>
            </View>
          </View>
          <Text style={[styles.cardMeta, { color: palette.muted }]}>
            {r.reservation
              ? `${r.reservation.serviceDate} · ${r.reservation.serviceTime}`
              : formatDate(r.completedAt)}
          </Text>
          {r.reservation?.pickupLocation ? (
            <Text style={[styles.cardRoute, { color: palette.textSecondary }]} numberOfLines={1}>
              {shortLoc(r.reservation.pickupLocation)}
            </Text>
          ) : null}
          <View style={styles.cardFooter}>
            <Text style={[styles.cardFootLabel, { color: palette.muted }]}>
              {r.commissionPct.toFixed(1)}% of ${r.serviceBasis.toFixed(2)}
            </Text>
            <Text style={[styles.cardNet, { color: "#FF9F0A" }]}>
              ${r.amountOwed.toFixed(2)}
            </Text>
          </View>
        </View>
      );
    }

    // earning
    const e = item.row;
    const chip = statusColors(e.status);
    const netColor =
      e.status === "PAID"
        ? "#34C759"
        : e.status === "HELD"
          ? "#FF9F0A"
          : e.status === "VOID" || e.status === "REASSIGNED"
            ? palette.muted
            : GOLD;
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: palette.border },
        ]}
      >
        <View style={styles.cardTopRow}>
          <Text style={styles.code}>{e.bookingId}</Text>
          <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
            <Text style={[styles.statusChipText, { color: chip.fg }]}>
              {chip.label}
              {e.mode === "NO_SHOW" ? " · no-show" : ""}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardMeta, { color: palette.muted }]}>
          {e.reservation
            ? `${e.reservation.serviceDate} · ${e.reservation.serviceTime}`
            : formatDate(e.completedAt)}
        </Text>
        {e.reservation?.pickupLocation ? (
          <Text style={[styles.cardRoute, { color: palette.textSecondary }]} numberOfLines={1}>
            {shortLoc(e.reservation.pickupLocation)}
            {e.reservation.dropoffLocation
              ? ` → ${shortLoc(e.reservation.dropoffLocation)}`
              : ""}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={[styles.cardFootLabel, { color: palette.muted }]}>
            {e.commissionPct.toFixed(1)}% fee · tip ${e.gratuity.toFixed(2)}
          </Text>
          <Text style={[styles.cardNet, { color: netColor }]}>
            ${e.driverNet.toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <DriverScreenShell>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            { backgroundColor: palette.softFill, borderColor: palette.border },
          ]}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={22} color={palette.icon} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.text }]}>Earnings</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <SlimSpinner size={34} stroke={2} color={GOLD} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => {
            if (item.kind === "earning") return `e-${item.row.id}`;
            if (item.kind === "remittance") return `r-${item.row.id}`;
            if (item.kind === "section") return `s-${item.label}-${idx}`;
            if (item.kind === "summary") return "summary";
            return `empty-${idx}`;
          }}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load({ refresh: true })}
              tintColor={GOLD}
              colors={[GOLD]}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (nextCursor && !loadingMore) {
              void load({ cursor: nextCursor, append: true });
            }
          }}
          ListFooterComponent={
            <View style={styles.footer}>
              {error ? (
                <Text style={[styles.errorText, { color: palette.muted }]}>{error}</Text>
              ) : loadingMore ? (
                <ActivityIndicator color={GOLD} />
              ) : !nextCursor && earnings.length > 0 ? (
                <Text style={[styles.endText, { color: palette.muted }]}>
                  End of ledger
                </Text>
              ) : null}
            </View>
          }
        />
      )}
    </DriverScreenShell>
  );
}

function StatTile({
  label,
  value,
  hint,
  valueColor,
  bg,
  border,
  labelColor,
  hintColor,
}: {
  label: string;
  value: string;
  hint: string;
  valueColor: string;
  bg: string;
  border: string;
  labelColor: string;
  hintColor: string;
}) {
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: bg, borderColor: border },
      ]}
    >
      <Text style={[styles.tileLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: valueColor }]}>{value}</Text>
      <Text style={[styles.tileHint, { color: hintColor }]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  summaryGroup: {
    marginBottom: 14,
    gap: 10,
  },
  weekCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  weekValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: 4,
  },
  weekHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  tile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  tileValue: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 4,
  },
  tileHint: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: "500",
  },
  empty: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 24,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  code: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  cardRoute: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  cardFooter: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardFootLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardNet: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    fontWeight: "500",
  },
  endText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
