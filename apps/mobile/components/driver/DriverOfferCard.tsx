import { type ReactNode } from "react";
import { View, Text, StyleSheet, Platform, Animated } from "react-native";
import { useDriverTheme } from "../../contexts/DriverThemeContext";
import { GOLD } from "../../theme/driver-theme";
import { DriverGhostButton, DriverPrimaryButton } from "./DriverButtons";

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  const first = s.split(",")[0]?.trim();
  return first || s.trim();
}

export type DriverOfferCardProps = {
  customerName: string;
  phone?: string | null;
  serviceDate: string;
  serviceTime: string;
  passengers?: number | null;
  vehicle?: string | null;
  bookingId: string;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  isParcel?: boolean;
  isLive?: boolean;
  showNewBadge?: boolean;
  livePulse?: Animated.Value;
  fareLabel?: string | null;
  mode: "request" | "upcoming";
  onReject: () => void;
  onPrimary: () => void;
  footerHint?: ReactNode;
};

export function DriverOfferCard({
  customerName,
  phone,
  serviceDate,
  serviceTime,
  passengers,
  vehicle,
  bookingId,
  pickupLocation,
  dropoffLocation,
  isParcel,
  isLive,
  showNewBadge,
  livePulse,
  fareLabel,
  mode,
  onReject,
  onPrimary,
  footerHint,
}: DriverOfferCardProps) {
  const { palette } = useDriverTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: Platform.OS === "android" ? palette.cardAndroid : palette.cardSurface,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.customerBlock}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
              {customerName}
            </Text>
            {isParcel ? (
              <View style={styles.parcelBadge}>
                <Text style={styles.parcelText}>PARCEL</Text>
              </View>
            ) : null}
            {showNewBadge ? (
              <View style={[styles.badge, isLive && styles.liveBadge]}>
                {isLive && livePulse ? (
                  <Animated.View
                    style={[
                      styles.liveRing,
                      {
                        opacity: livePulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.35, 0],
                        }),
                        transform: [
                          {
                            scale: livePulse.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.85],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ) : null}
                <View style={[styles.dot, !isLive && styles.newDot]} />
                <Text style={[styles.badgeText, isLive && styles.liveText]}>
                  {isLive ? "LIVE" : "NEW"}
                </Text>
              </View>
            ) : null}
          </View>
          {phone ? (
            <Text style={[styles.phone, { color: palette.muted }]} numberOfLines={1}>
              {phone}
            </Text>
          ) : null}
        </View>
        {fareLabel ? (
          <Text style={[styles.fare, { color: palette.text }]}>{fareLabel}</Text>
        ) : null}
      </View>

      <Text style={[styles.when, { color: palette.metaText }]}>
        {serviceDate} · {serviceTime}
        {passengers != null ? ` · ${passengers} pax` : ""}
        {vehicle ? ` · ${vehicle}` : ""}
      </Text>

      <View style={[styles.route, { backgroundColor: palette.routeBg }]}>
        <View style={styles.rail}>
          <View style={[styles.railDot, { backgroundColor: GOLD }]} />
          <View style={[styles.railLine, { backgroundColor: palette.routeLine }]} />
          <View style={[styles.railDot, { backgroundColor: palette.text }]} />
        </View>
        <View style={styles.routeCopy}>
          <Text style={[styles.loc, { color: palette.location }]} numberOfLines={1}>
            {shortLoc(pickupLocation)}
          </Text>
          <Text style={[styles.loc, { color: palette.location, marginTop: 10 }]} numberOfLines={1}>
            {shortLoc(dropoffLocation)}
          </Text>
        </View>
      </View>

      <Text style={[styles.bookingId, { color: palette.muted }]} numberOfLines={1}>
        {bookingId}
      </Text>

      {footerHint}

      <View style={styles.actions}>
        <DriverGhostButton
          label={mode === "request" ? "Reject" : "Cancel"}
          onPress={onReject}
          danger={mode === "request"}
          style={styles.actionBtn}
        />
        <DriverPrimaryButton
          label={mode === "request" ? "Accept" : "Open ride"}
          onPress={onPrimary}
          icon={mode === "request" ? "checkmark" : "arrow-forward"}
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  customerBlock: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  phone: { marginTop: 2, fontSize: 13, fontWeight: "500" },
  fare: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },
  when: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
  },
  parcelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(212,160,74,0.18)",
  },
  parcelText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: "#8B6914",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(46,125,79,0.14)",
    overflow: "visible",
  },
  liveBadge: { backgroundColor: "rgba(212,160,74,0.16)" },
  liveRing: {
    position: "absolute",
    left: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2E7D4F",
  },
  newDot: { backgroundColor: "#2E7D4F" },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#1B5E3A",
  },
  liveText: { color: "#8B6914" },
  route: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 12,
  },
  rail: {
    width: 10,
    alignItems: "center",
    paddingVertical: 4,
  },
  railDot: { width: 8, height: 8, borderRadius: 4 },
  railLine: { flex: 1, width: 2, marginVertical: 4, borderRadius: 1 },
  routeCopy: { flex: 1, minWidth: 0, justifyContent: "space-between" },
  loc: { fontSize: 14, fontWeight: "600", letterSpacing: -0.2 },
  bookingId: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: { flex: 1 },
});
