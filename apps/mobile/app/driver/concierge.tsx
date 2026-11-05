import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getDriverConciergeRides,
  getDriverConciergeEarnings,
  patchDriverConcierge,
  type ConciergeRide,
  type ConciergeDriverProfile,
  type DriverConciergeEarnings,
} from "../../services/api";
import { SlimSpinner } from "../../components/SlimSpinner";
import {
  GOLD,
  DRIVER_ONLINE_GREEN,
  DRIVER_PRIMARY_INK,
} from "../../theme/driver-theme";
import { DriverScreenShell } from "../../components/driver/DriverScreenShell";
import { useDriverTheme } from "../../contexts/DriverThemeContext";

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  return s.split(",")[0]?.trim() || s.trim();
}

function membershipLabel(profile: ConciergeDriverProfile | null) {
  if (!profile) return "Not enrolled";
  const status = profile.membershipStatus || "UNKNOWN";
  if (profile.membershipExpiresAt) {
    const d = new Date(profile.membershipExpiresAt);
    return `${status} · expires ${d.toLocaleDateString()}`;
  }
  return status;
}

const NEXT_STATUS: Record<
  string,
  { label: string; status: "ON_THE_WAY" | "ARRIVED" | "IN_TRIP" | "COMPLETED" }[]
> = {
  ASSIGNED: [{ label: "On the way", status: "ON_THE_WAY" }],
  ON_THE_WAY: [{ label: "Arrived", status: "ARRIVED" }],
  ARRIVED: [{ label: "Start trip", status: "IN_TRIP" }],
  IN_TRIP: [{ label: "Complete", status: "COMPLETED" }],
};

export default function DriverConciergeScreen() {
  const { palette, isDark } = useDriverTheme();
  const [enrolled, setEnrolled] = useState(false);
  const [profile, setProfile] = useState<ConciergeDriverProfile | null>(null);
  const [openRequests, setOpenRequests] = useState<ConciergeRide[]>([]);
  const [myRides, setMyRides] = useState<ConciergeRide[]>([]);
  const [earnings, setEarnings] = useState<DriverConciergeEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dismissedOpenIds, setDismissedOpenIds] = useState<Set<string>>(new Set());

  const cardBg = isDark ? palette.softFill : palette.cardSurface;
  const earnTileBg = isDark ? "rgba(0,0,0,0.25)" : palette.softFill;

  const load = useCallback(async () => {
    try {
      const [openRes, mineRes, earnRes] = await Promise.all([
        getDriverConciergeRides("open"),
        getDriverConciergeRides("mine"),
        getDriverConciergeEarnings(),
      ]);
      const isEnrolled = !!openRes.enrolled;
      setEnrolled(isEnrolled);
      if (!isEnrolled) {
        setProfile(null);
        setOpenRequests([]);
        setMyRides([]);
        return;
      }
      setProfile(openRes.profile || mineRes.profile || null);
      setOpenRequests(openRes.openRequests || []);
      setMyRides(mineRes.myRides || []);
      if (earnRes.success) setEarnings(earnRes.earnings);
    } catch (e: unknown) {
      setEnrolled(false);
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load Concierge");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isBusy = profile?.availability === "BUSY";
  const isOnline = profile?.availability === "ONLINE";

  const toggleAvailability = async (next: boolean) => {
    if (isBusy) {
      Alert.alert("Busy", "Finish your active hotel trip first.");
      return;
    }
    try {
      const res = await patchDriverConcierge({
        action: "set_availability",
        availability: next ? "ONLINE" : "OFFLINE",
      });
      if (res.success && res.profile) {
        setProfile((prev) =>
          prev ? { ...prev, ...res.profile! } : (res.profile as ConciergeDriverProfile)
        );
      }
      await load();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not update availability");
    }
  };

  const acceptRide = (rideId: string) => {
    Alert.alert("Accept hotel ride?", "You will be marked Busy until the trip ends.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Accept",
        onPress: () => {
          void (async () => {
            setBusyId(rideId);
            try {
              await patchDriverConcierge({ action: "accept", rideId });
              await load();
            } catch (e: unknown) {
              Alert.alert("Error", e instanceof Error ? e.message : "Accept failed");
            } finally {
              setBusyId(null);
            }
          })();
        },
      },
    ]);
  };

  const rejectRide = (rideId: string) => {
    Alert.alert("Decline this request?", "It will stay available for other drivers.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusyId(rideId);
            try {
              await patchDriverConcierge({ action: "reject", rideId });
              setDismissedOpenIds((prev) => new Set(prev).add(rideId));
            } catch (e: unknown) {
              Alert.alert("Error", e instanceof Error ? e.message : "Decline failed");
            } finally {
              setBusyId(null);
            }
          })();
        },
      },
    ]);
  };

  const cancelTrip = (rideId: string) => {
    Alert.alert("Cancel hotel trip?", "You will go back Online for new hotel requests.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel trip",
        style: "destructive",
        onPress: () => updateStatus(rideId, "CANCELLED"),
      },
    ]);
  };

  const updateStatus = (
    rideId: string,
    status: "ON_THE_WAY" | "ARRIVED" | "IN_TRIP" | "COMPLETED" | "CANCELLED"
  ) => {
    void (async () => {
      setBusyId(rideId);
      try {
        await patchDriverConcierge({ action: "status", rideId, status });
        await load();
      } catch (e: unknown) {
        Alert.alert("Error", e instanceof Error ? e.message : "Update failed");
      } finally {
        setBusyId(null);
      }
    })();
  };

  const setCommission = (rideId: string, driverClaim: "PAID" | "NOT_PAID") => {
    void (async () => {
      setBusyId(rideId);
      try {
        await patchDriverConcierge({ action: "commission", rideId, driverClaim });
        await load();
      } catch (e: unknown) {
        Alert.alert("Error", e instanceof Error ? e.message : "Commission update failed");
      } finally {
        setBusyId(null);
      }
    })();
  };

  const rateConcierge = (rideId: string) => {
    Alert.alert("Rate concierge", "How was this hotel partner?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "★★★★★",
        onPress: () => {
          void (async () => {
            try {
              await patchDriverConcierge({ action: "rate", rideId, stars: 5 });
              Alert.alert("Thanks", "Rating saved.");
            } catch (e: unknown) {
              Alert.alert("Error", e instanceof Error ? e.message : "Rating failed");
            }
          })();
        },
      },
      {
        text: "★★★★",
        onPress: () => {
          void patchDriverConcierge({ action: "rate", rideId, stars: 4 }).catch((e: unknown) =>
            Alert.alert("Error", e instanceof Error ? e.message : "Rating failed")
          );
        },
      },
    ]);
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
        <Text style={[styles.topTitle, { color: palette.text }]}>Hotel Concierge</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <SlimSpinner size={34} stroke={2} color={GOLD} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={GOLD}
              colors={[GOLD]}
            />
          }
        >
          {!enrolled ? (
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: palette.hintBg,
                  borderColor: palette.hintBorder,
                },
              ]}
            >
              <Text style={[styles.bannerTitle, { color: palette.hintBold }]}>Not enrolled</Text>
              <Text style={[styles.bannerBody, { color: palette.hintText }]}>
                Ask admin to add you to the Hotel Concierge driver network.
              </Text>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.onlineCard,
                  { backgroundColor: cardBg, borderColor: palette.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.onlineLabel, { color: palette.text }]}>
                    {isBusy ? "Busy on hotel trip" : isOnline ? "Online for hotels" : "Offline"}
                  </Text>
                  <Text style={[styles.membership, { color: palette.muted }]}>
                    {membershipLabel(profile)}
                  </Text>
                </View>
                {isBusy ? (
                  <View style={styles.busyBadge}>
                    <Text style={[styles.busyBadgeText, { color: DRIVER_PRIMARY_INK }]}>BUSY</Text>
                  </View>
                ) : (
                  <Switch
                    value={isOnline}
                    onValueChange={toggleAvailability}
                    trackColor={{ false: palette.switchTrackOff, true: DRIVER_ONLINE_GREEN }}
                    thumbColor="#FFFFFF"
                  />
                )}
              </View>

              <View
                style={[
                  styles.earnCard,
                  { backgroundColor: cardBg, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Earnings</Text>
                <View style={styles.earnRow}>
                  <EarnStat
                    label="Trips"
                    value={String(earnings?.completedTrips ?? 0)}
                    tileBg={earnTileBg}
                    labelColor={palette.muted}
                  />
                  <EarnStat
                    label="Net"
                    value={`$${(earnings?.netEarnings ?? 0).toFixed(0)}`}
                    tileBg={earnTileBg}
                    labelColor={palette.muted}
                  />
                  <EarnStat
                    label="Hotel $"
                    value={`$${(earnings?.hotelCommissions ?? 0).toFixed(0)}`}
                    tileBg={earnTileBg}
                    labelColor={palette.muted}
                  />
                </View>
                <Text style={[styles.referralNote, { color: palette.muted }]}>
                  Referral earnings: ${(earnings?.referralEarnings ?? 0).toFixed(2)} (placeholder)
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { color: palette.text }]}>Open requests</Text>
              {openRequests.filter((r) => !dismissedOpenIds.has(r.id)).length === 0 ? (
                <Text style={[styles.empty, { color: palette.muted }]}>
                  No open hotel requests matching your vehicle.
                </Text>
              ) : (
                openRequests
                  .filter((r) => !dismissedOpenIds.has(r.id))
                  .map((ride) => (
                    <View
                      key={ride.id}
                      style={[
                        styles.rideCard,
                        { backgroundColor: cardBg, borderColor: palette.border },
                      ]}
                    >
                      <Text style={styles.code}>{ride.requestCode}</Text>
                      <Text style={[styles.hotel, { color: palette.text }]}>
                        {ride.hotel?.name || "Hotel"}
                      </Text>
                      <Text style={[styles.route, { color: palette.textSecondary }]}>
                        {shortLoc(ride.pickupLocation)} → {shortLoc(ride.dropoffLocation)}
                      </Text>
                      <Text style={[styles.meta, { color: palette.muted }]}>
                        ${Number(ride.fare || 0).toFixed(2)} ·{" "}
                        {String(ride.vehicleRequestRule).replace(/_/g, " ")}
                      </Text>
                      <View style={styles.openActions}>
                        <Pressable
                          style={styles.acceptBtn}
                          disabled={busyId === ride.id}
                          onPress={() => acceptRide(ride.id)}
                        >
                          {busyId === ride.id ? (
                            <ActivityIndicator color={DRIVER_PRIMARY_INK} />
                          ) : (
                            <Text style={[styles.acceptText, { color: DRIVER_PRIMARY_INK }]}>
                              Accept
                            </Text>
                          )}
                        </Pressable>
                        <Pressable
                          style={[styles.declineBtn, { borderColor: palette.rejectBorder }]}
                          disabled={busyId === ride.id}
                          onPress={() => rejectRide(ride.id)}
                        >
                          <Text style={[styles.declineText, { color: palette.rejectText }]}>
                            Decline
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
              )}

              <Text style={[styles.sectionTitle, { color: palette.text, marginTop: 20 }]}>
                My hotel rides
              </Text>
              {myRides.length === 0 ? (
                <Text style={[styles.empty, { color: palette.muted }]}>
                  No assigned hotel rides yet.
                </Text>
              ) : (
                myRides.map((ride) => {
                  const next = NEXT_STATUS[ride.status] || [];
                  const canCancelTrip = ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_TRIP"].includes(
                    ride.status
                  );
                  return (
                    <View
                      key={ride.id}
                      style={[
                        styles.rideCard,
                        { backgroundColor: cardBg, borderColor: palette.border },
                      ]}
                    >
                      <View style={styles.rideTop}>
                        <Text style={styles.code}>{ride.requestCode}</Text>
                        <Text style={[styles.status, { color: palette.muted }]}>
                          {String(ride.status).replace(/_/g, " ")}
                        </Text>
                      </View>
                      <Text style={[styles.hotel, { color: palette.text }]}>
                        {ride.hotel?.name || "Hotel"}
                      </Text>
                      <Text style={[styles.route, { color: palette.textSecondary }]}>
                        {shortLoc(ride.pickupLocation)} → {shortLoc(ride.dropoffLocation)}
                      </Text>
                      <Text style={[styles.meta, { color: palette.muted }]}>
                        Guest: {ride.guestName || "—"} · Concierge: {ride.concierge?.name || "—"}
                      </Text>
                      <Text style={[styles.meta, { color: palette.muted }]}>
                        Pay: {ride.guestPaymentMethod || "UNSET"} · Fee $
                        {Number(ride.platformFee || 0).toFixed(2)} · Net $
                        {(Number(ride.fare || 0) - Number(ride.platformFee || 0)).toFixed(2)}
                      </Text>

                      {next.map((n) => (
                        <Pressable
                          key={n.status}
                          style={styles.statusBtn}
                          disabled={busyId === ride.id}
                          onPress={() => updateStatus(ride.id, n.status)}
                        >
                          <Text style={[styles.statusBtnText, { color: DRIVER_PRIMARY_INK }]}>
                            {n.label}
                          </Text>
                        </Pressable>
                      ))}

                      {canCancelTrip ? (
                        <Pressable
                          style={[styles.cancelTripBtn, { borderColor: palette.danger }]}
                          disabled={busyId === ride.id}
                          onPress={() => cancelTrip(ride.id)}
                        >
                          <Text style={[styles.cancelTripText, { color: palette.danger }]}>
                            Cancel trip
                          </Text>
                        </Pressable>
                      ) : null}

                      {ride.status === "COMPLETED" ? (
                        <View style={styles.completedActions}>
                          <Pressable
                            style={styles.smallBtn}
                            onPress={() => setCommission(ride.id, "PAID")}
                          >
                            <Text style={[styles.smallBtnText, { color: DRIVER_PRIMARY_INK }]}>
                              Commission paid
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[
                              styles.smallBtn,
                              styles.smallBtnAlt,
                              { borderColor: palette.rejectBorder },
                            ]}
                            onPress={() => setCommission(ride.id, "NOT_PAID")}
                          >
                            <Text style={[styles.smallBtnText, { color: palette.text }]}>
                              Not paid
                            </Text>
                          </Pressable>
                          <Pressable
                            style={styles.smallBtn}
                            onPress={() => rateConcierge(ride.id)}
                          >
                            <Text style={[styles.smallBtnText, { color: DRIVER_PRIMARY_INK }]}>
                              Rate concierge
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      )}
    </DriverScreenShell>
  );
}

function EarnStat({
  label,
  value,
  tileBg,
  labelColor,
}: {
  label: string;
  value: string;
  tileBg: string;
  labelColor: string;
}) {
  return (
    <View style={[styles.earnStat, { backgroundColor: tileBg }]}>
      <Text style={styles.earnValue}>{value}</Text>
      <Text style={[styles.earnLabel, { color: labelColor }]}>{label}</Text>
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
  topTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 40 },
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
  },
  bannerTitle: { fontWeight: "700", fontSize: 16, marginBottom: 6 },
  bannerBody: { fontSize: 14, lineHeight: 20 },
  onlineCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  onlineLabel: { fontSize: 16, fontWeight: "700" },
  membership: { fontSize: 12, marginTop: 4 },
  busyBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  busyBadgeText: { fontWeight: "800", fontSize: 11 },
  earnCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  earnRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  earnStat: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  earnValue: { color: GOLD, fontSize: 16, fontWeight: "800" },
  earnLabel: { fontSize: 11, marginTop: 4 },
  referralNote: { fontSize: 12, marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  empty: { fontSize: 13, marginBottom: 12 },
  rideCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rideTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  code: { color: GOLD, fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },
  status: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  hotel: { fontSize: 15, fontWeight: "700", marginTop: 6 },
  route: { fontSize: 13, marginTop: 4 },
  meta: { fontSize: 12, marginTop: 6 },
  acceptBtn: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  acceptText: { fontWeight: "800", fontSize: 14 },
  openActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  declineBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  declineText: { fontWeight: "700", fontSize: 14 },
  cancelTripBtn: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  cancelTripText: { fontWeight: "800", fontSize: 14 },
  statusBtn: {
    marginTop: 10,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  statusBtnText: { fontWeight: "800", fontSize: 14 },
  completedActions: { marginTop: 10, gap: 8 },
  smallBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  smallBtnAlt: {
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  smallBtnText: { fontWeight: "800", fontSize: 13 },
});
