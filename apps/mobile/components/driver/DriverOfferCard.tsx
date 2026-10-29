import { type ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDriverTheme } from "../../contexts/DriverThemeContext";
import { GOLD, DRIVER_ONLINE_GREEN, DRIVER_PRIMARY_INK } from "../../theme/driver-theme";

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  const first = s.split(",")[0]?.trim();
  return first || s.trim();
}

function initialOf(name: string) {
  const t = name.trim();
  return (t[0] || "?").toUpperCase();
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
  /** API status — shapes Upcoming CTA (Start vs Open). */
  status?: string | null;
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
  status,
  onReject,
  onPrimary,
  footerHint,
}: DriverOfferCardProps) {
  const { palette } = useDriverTheme();
  const metaChipBg = palette.metaChipBg;
  const sheetBorder = palette.border;
  /** Warm cream/gold wash — matches driver shell, not flat grey. */
  const declineBg = palette.hintBg;
  const avatarBg = palette.avatarBg;
  const upcomingReady =
    mode === "upcoming" &&
    (status === "ACCEPTED" || status === "PENDING" || !status);
  const primaryLabel =
    mode === "request"
      ? "Accept"
      : upcomingReady
        ? "Start · I'm on the way"
        : "Open ride";

  const vehicleLine = [
    vehicle || null,
    passengers != null
      ? `${passengers} passenger${passengers === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const callCustomer = () => {
    const digits = (phone || "").replace(/[^\d+]/g, "");
    if (!digits) return;
    Linking.openURL(`tel:${digits}`).catch(() => {});
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surfaceElevated,
          borderColor: sheetBorder,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={[styles.avatarLetter, { color: palette.text }]}>
            {initialOf(customerName)}
          </Text>
        </View>

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
                <Text style={[styles.badgeText, isLive && styles.liveText]}>
                  {isLive ? "LIVE" : "NEW"}
                </Text>
              </View>
            ) : null}
          </View>
          {vehicleLine ? (
            <Text style={[styles.metaLine, { color: palette.muted }]} numberOfLines={1}>
              {vehicleLine}
            </Text>
          ) : null}
        </View>

        <View style={styles.topRight}>
          {fareLabel ? (
            <Text style={[styles.fare, { color: palette.text }]}>{fareLabel}</Text>
          ) : null}
          {phone ? (
            <Pressable
              onPress={callCustomer}
              accessibilityRole="button"
              accessibilityLabel="Call customer"
              style={({ pressed }) => [
                styles.phoneBtn,
                { backgroundColor: palette.hintBg, borderColor: palette.hintBorder },
                pressed && { opacity: 0.75 },
              ]}
              hitSlop={6}
            >
              <Ionicons name="call-outline" size={16} color={GOLD} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={[styles.whenBar, { backgroundColor: metaChipBg }]}>
        <View style={styles.whenLeft}>
          <Ionicons name="calendar-outline" size={14} color={GOLD} />
          <Text style={[styles.whenText, { color: palette.metaText }]} numberOfLines={1}>
            {serviceDate} · {serviceTime}
          </Text>
        </View>
        <Text style={[styles.bookingId, { color: palette.muted }]} numberOfLines={1}>
          #{bookingId.replace(/^#/, "")}
        </Text>
      </View>

      <View style={styles.route}>
        <View style={styles.rail}>
          <View style={[styles.railCircle, { borderColor: GOLD }]} />
          <View style={[styles.railLine, { backgroundColor: palette.routeLine }]} />
          <View style={[styles.railSquare, { backgroundColor: palette.text }]} />
        </View>
        <View style={styles.routeCopy}>
          <View>
            <Text style={[styles.routeLabel, { color: palette.muted }]}>Pickup</Text>
            <Text style={[styles.loc, { color: palette.location }]} numberOfLines={2}>
              {shortLoc(pickupLocation)}
            </Text>
          </View>
          <View style={styles.dropBlock}>
            <Text style={[styles.routeLabel, { color: palette.muted }]}>Drop-off</Text>
            <Text style={[styles.loc, { color: palette.location }]} numberOfLines={2}>
              {shortLoc(dropoffLocation)}
            </Text>
          </View>
        </View>
      </View>

      {footerHint}

      {mode === "upcoming" ? (
        <View style={styles.upcomingActions}>
          <Pressable
            onPress={onPrimary}
            style={({ pressed }) => [
              styles.startBtn,
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
          >
            <Ionicons name="navigate" size={16} color={GOLD} />
            <Text style={styles.startBtnText}>{primaryLabel}</Text>
          </Pressable>
          {upcomingReady ? (
            <Text style={[styles.startHint, { color: palette.muted }]}>
              Rider gets notified when you start
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable
            onPress={onReject}
            style={({ pressed }) => [
              styles.declineBtn,
              {
                backgroundColor: declineBg,
                borderColor: palette.hintBorder,
              },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Decline"
          >
            <Text style={[styles.declineText, { color: palette.hintBold }]}>
              Decline
            </Text>
          </Pressable>
          <Pressable
            onPress={onPrimary}
            style={({ pressed }) => [
              styles.acceptBtn,
              { backgroundColor: GOLD },
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Accept"
          >
            <Text style={[styles.acceptText, { color: DRIVER_PRIMARY_INK }]}>
              Accept
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  customerBlock: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  metaLine: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
  },
  topRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  fare: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },
  phoneBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
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
    color: "#7A5A28",
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(46,125,79,0.16)",
    overflow: "visible",
  },
  liveBadge: { backgroundColor: "rgba(212,160,74,0.16)" },
  liveRing: {
    position: "absolute",
    left: 4,
    top: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: DRIVER_ONLINE_GREEN,
  },
  liveText: { color: "#7A5A28" },
  whenBar: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  whenLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  whenText: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  bookingId: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.15,
    flexShrink: 0,
    maxWidth: "42%",
  },
  route: {
    marginTop: 14,
    flexDirection: "row",
    gap: 12,
  },
  rail: {
    width: 14,
    alignItems: "center",
    paddingTop: 4,
  },
  railCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  railSquare: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  railLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
    borderRadius: 1,
    minHeight: 22,
  },
  routeCopy: { flex: 1, minWidth: 0, justifyContent: "space-between", gap: 12 },
  dropBlock: {},
  routeLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
    letterSpacing: 0.1,
  },
  loc: { fontSize: 14, fontWeight: "600", letterSpacing: -0.2 },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  declineBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  declineText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  acceptBtn: {
    flex: 1.15,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  acceptText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  upcomingActions: { marginTop: 14, gap: 8 },
  startBtn: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: DRIVER_PRIMARY_INK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  startBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  startHint: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
  },
});
