import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { getDriverRides, type DriverRide } from "../../../services/api";
import { useDriverTheme } from "../../../contexts/DriverThemeContext";
import { GOLD } from "../../../theme/driver-theme";
import { SlimSpinner } from "../../../components/SlimSpinner";
import { DriverScreenShell } from "../../../components/driver/DriverScreenShell";
import { DriverEmptyState } from "../../../components/driver/DriverEmptyState";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Match footer content height in `(tabs)/_layout`. */
const TAB_BAR_CONTENT_H = 46;

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  return s.split(",")[0]?.trim() || s.trim();
}

function PayBadge({ ride, muted }: { ride: DriverRide; muted: string }) {
  const pay = ride.pay;
  const status = String(ride.status || "").toUpperCase();
  const isCancelled = status === "CANCELLED" || status === "CANCELED";

  if (!pay) {
    // No ledger row (cancelled / comped / not yet eligible)
    return (
      <View style={[styles.payChip, { backgroundColor: "rgba(142,142,147,0.14)" }]}>
        <Text style={[styles.payChipText, { color: muted }]}>
          {isCancelled ? "No pay record" : "Pending pay sync"}
        </Text>
      </View>
    );
  }

  const bg =
    pay.status === "PAID"
      ? "rgba(52,199,89,0.14)"
      : pay.status === "HELD"
        ? "rgba(255,159,10,0.16)"
        : pay.status === "VOID" || pay.status === "REASSIGNED"
          ? "rgba(142,142,147,0.14)"
          : "rgba(212,160,74,0.18)";
  const fg =
    pay.status === "PAID"
      ? "#34C759"
      : pay.status === "HELD"
        ? "#FF9F0A"
        : pay.status === "VOID" || pay.status === "REASSIGNED"
          ? muted
          : "#C9A063";

  const noShow = pay.mode === "NO_SHOW" ? " · no-show" : "";
  const net = typeof pay.driverNet === "number" ? `$${pay.driverNet.toFixed(2)}` : "—";

  const label =
    pay.status === "PAID"
      ? `Paid ${net}${noShow}`
      : pay.status === "HELD"
        ? `On hold · ${net}${noShow}`
        : pay.status === "VOID"
          ? "No pay (voided)"
          : pay.status === "REASSIGNED"
            ? "Reassigned"
            : `Owed ${net}${noShow}`;

  return (
    <View style={[styles.payChip, { backgroundColor: bg }]}>
      <Text style={[styles.payChipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

function HistoryCard({
  ride,
  text,
  muted,
  surface,
  border,
  soft,
}: {
  ride: DriverRide;
  text: string;
  muted: string;
  surface: string;
  border: string;
  soft: string;
}) {
  const status = String(ride.status || "").toUpperCase();
  const isNoShow = status === "NO_SHOW";
  const isCancelled = status === "CANCELLED" || status === "CANCELED";

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.cardHeaderRow}>
        <View style={[styles.whenPill, { backgroundColor: soft }]}>
          <Text style={[styles.whenText, { color: muted }]}>
            {ride.serviceDate}  ·  {ride.serviceTime}
          </Text>
        </View>
        {isNoShow ? (
          <View style={[styles.statusTag, { backgroundColor: "rgba(255,69,58,0.14)" }]}>
            <Text style={[styles.statusTagText, { color: "#FF453A" }]}>No-show</Text>
          </View>
        ) : isCancelled ? (
          <View style={[styles.statusTag, { backgroundColor: "rgba(142,142,147,0.14)" }]}>
            <Text style={[styles.statusTagText, { color: muted }]}>Cancelled</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.label, { color: muted }]}>From</Text>
      <Text style={[styles.place, { color: text }]} numberOfLines={2}>
        {shortLoc(ride.pickupLocation)}
      </Text>

      <Text style={[styles.label, styles.labelTo, { color: muted }]}>To</Text>
      <Text style={[styles.place, { color: text }]} numberOfLines={2}>
        {shortLoc(ride.dropoffLocation)}
      </Text>

      <View style={styles.payRow}>
        <PayBadge ride={ride} muted={muted} />
      </View>
    </View>
  );
}

export default function DriverHistoryScreen() {
  const { palette } = useDriverTheme();
  const insets = useSafeAreaInsets();
  const [rides, setRides] = useState<DriverRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    try {
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await getDriverRides("completed");
      if (!data.success) {
        setError("Could not load history.");
        return;
      }
      setRides(data.rides || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history.");
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
        <Text style={[styles.title, { color: palette.text }]}>History</Text>
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
            rides.length === 0 && styles.listEmpty,
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
          ) : rides.length === 0 ? (
            <DriverEmptyState
              icon="time-outline"
              title="No trips yet"
              subtitle="Completed rides will show up here."
            />
          ) : (
            rides.map((item) => (
              <HistoryCard
                key={item.bookingId || item.id}
                ride={item}
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
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  whenPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 14,
  },
  whenText: {
    fontSize: 13,
    fontWeight: "600",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  labelTo: {
    marginTop: 12,
  },
  place: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 14,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  payRow: {
    marginTop: 14,
    flexDirection: "row",
  },
  payChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  payChipText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
