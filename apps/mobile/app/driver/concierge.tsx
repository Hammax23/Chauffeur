import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  Switch,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { GOLD } from "../../theme/driver-theme";

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

const NEXT_STATUS: Record<string, { label: string; status: "ON_THE_WAY" | "ARRIVED" | "IN_TRIP" | "COMPLETED" }[]> = {
  ASSIGNED: [{ label: "On the way", status: "ON_THE_WAY" }],
  ON_THE_WAY: [{ label: "Arrived", status: "ARRIVED" }],
  ARRIVED: [{ label: "Start trip", status: "IN_TRIP" }],
  IN_TRIP: [{ label: "Complete", status: "COMPLETED" }],
};

export default function DriverConciergeScreen() {
  const [enrolled, setEnrolled] = useState(true);
  const [profile, setProfile] = useState<ConciergeDriverProfile | null>(null);
  const [openRequests, setOpenRequests] = useState<ConciergeRide[]>([]);
  const [myRides, setMyRides] = useState<ConciergeRide[]>([]);
  const [earnings, setEarnings] = useState<DriverConciergeEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dismissedOpenIds, setDismissedOpenIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const [openRes, mineRes, earnRes] = await Promise.all([
        getDriverConciergeRides("open"),
        getDriverConciergeRides("mine"),
        getDriverConciergeEarnings(),
      ]);
      setEnrolled(!!openRes.enrolled);
      setProfile(openRes.profile || mineRes.profile || null);
      setOpenRequests(openRes.openRequests || []);
      setMyRides(mineRes.myRides || []);
      if (earnRes.success) setEarnings(earnRes.earnings);
    } catch (e: unknown) {
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
        setProfile((prev) => (prev ? { ...prev, ...res.profile! } : (res.profile as ConciergeDriverProfile)));
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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b0b" />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.topTitle}>Hotel Concierge</Text>
          <View style={{ width: 36 }} />
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
              <View style={styles.banner}>
                <Text style={styles.bannerTitle}>Not enrolled</Text>
                <Text style={styles.bannerBody}>
                  Ask admin to add you to the Hotel Concierge driver network.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.onlineCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.onlineLabel}>
                      {isBusy ? "Busy on hotel trip" : isOnline ? "Online for hotels" : "Offline"}
                    </Text>
                    <Text style={styles.membership}>{membershipLabel(profile)}</Text>
                  </View>
                  {isBusy ? (
                    <View style={styles.busyBadge}>
                      <Text style={styles.busyBadgeText}>BUSY</Text>
                    </View>
                  ) : (
                    <Switch
                      value={isOnline}
                      onValueChange={toggleAvailability}
                      trackColor={{ false: "#333", true: "#2E7D4F" }}
                      thumbColor="#fff"
                    />
                  )}
                </View>

                <View style={styles.earnCard}>
                  <Text style={styles.sectionTitle}>Earnings</Text>
                  <View style={styles.earnRow}>
                    <EarnStat label="Trips" value={String(earnings?.completedTrips ?? 0)} />
                    <EarnStat label="Net" value={`$${(earnings?.netEarnings ?? 0).toFixed(0)}`} />
                    <EarnStat label="Hotel $" value={`$${(earnings?.hotelCommissions ?? 0).toFixed(0)}`} />
                  </View>
                  <Text style={styles.referralNote}>
                    Referral earnings: ${(earnings?.referralEarnings ?? 0).toFixed(2)} (placeholder)
                  </Text>
                </View>

                <Text style={styles.sectionTitle}>Open requests</Text>
                {openRequests.filter((r) => !dismissedOpenIds.has(r.id)).length === 0 ? (
                  <Text style={styles.empty}>No open hotel requests matching your vehicle.</Text>
                ) : (
                  openRequests
                    .filter((r) => !dismissedOpenIds.has(r.id))
                    .map((ride) => (
                    <View key={ride.id} style={styles.rideCard}>
                      <Text style={styles.code}>{ride.requestCode}</Text>
                      <Text style={styles.hotel}>{ride.hotel?.name || "Hotel"}</Text>
                      <Text style={styles.route}>
                        {shortLoc(ride.pickupLocation)} → {shortLoc(ride.dropoffLocation)}
                      </Text>
                      <Text style={styles.meta}>
                        ${Number(ride.fare || 0).toFixed(2)} · {String(ride.vehicleRequestRule).replace(/_/g, " ")}
                      </Text>
                      <View style={styles.openActions}>
                        <Pressable
                          style={styles.acceptBtn}
                          disabled={busyId === ride.id}
                          onPress={() => acceptRide(ride.id)}
                        >
                          {busyId === ride.id ? (
                            <ActivityIndicator color="#111" />
                          ) : (
                            <Text style={styles.acceptText}>Accept</Text>
                          )}
                        </Pressable>
                        <Pressable
                          style={styles.declineBtn}
                          disabled={busyId === ride.id}
                          onPress={() => rejectRide(ride.id)}
                        >
                          <Text style={styles.declineText}>Decline</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}

                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>My hotel rides</Text>
                {myRides.length === 0 ? (
                  <Text style={styles.empty}>No assigned hotel rides yet.</Text>
                ) : (
                  myRides.map((ride) => {
                    const next = NEXT_STATUS[ride.status] || [];
                    const canCancelTrip = ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_TRIP"].includes(
                      ride.status
                    );
                    return (
                      <View key={ride.id} style={styles.rideCard}>
                        <View style={styles.rideTop}>
                          <Text style={styles.code}>{ride.requestCode}</Text>
                          <Text style={styles.status}>{String(ride.status).replace(/_/g, " ")}</Text>
                        </View>
                        <Text style={styles.hotel}>{ride.hotel?.name || "Hotel"}</Text>
                        <Text style={styles.route}>
                          {shortLoc(ride.pickupLocation)} → {shortLoc(ride.dropoffLocation)}
                        </Text>
                        <Text style={styles.meta}>
                          Guest: {ride.guestName || "—"} · Concierge: {ride.concierge?.name || "—"}
                        </Text>
                        <Text style={styles.meta}>
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
                            <Text style={styles.statusBtnText}>{n.label}</Text>
                          </Pressable>
                        ))}

                        {canCancelTrip ? (
                          <Pressable
                            style={styles.cancelTripBtn}
                            disabled={busyId === ride.id}
                            onPress={() => cancelTrip(ride.id)}
                          >
                            <Text style={styles.cancelTripText}>Cancel trip</Text>
                          </Pressable>
                        ) : null}

                        {ride.status === "COMPLETED" ? (
                          <View style={styles.completedActions}>
                            <Pressable
                              style={styles.smallBtn}
                              onPress={() => setCommission(ride.id, "PAID")}
                            >
                              <Text style={styles.smallBtnText}>Commission paid</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.smallBtn, styles.smallBtnAlt]}
                              onPress={() => setCommission(ride.id, "NOT_PAID")}
                            >
                              <Text style={[styles.smallBtnText, { color: "#fff" }]}>Not paid</Text>
                            </Pressable>
                            <Pressable style={styles.smallBtn} onPress={() => rateConcierge(ride.id)}>
                              <Text style={styles.smallBtnText}>Rate concierge</Text>
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
      </SafeAreaView>
    </View>
  );
}

function EarnStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.earnStat}>
      <Text style={styles.earnValue}>{value}</Text>
      <Text style={styles.earnLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0b0b" },
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 40 },
  banner: {
    backgroundColor: "rgba(212,160,74,0.12)",
    borderColor: "rgba(212,160,74,0.35)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  bannerTitle: { color: GOLD, fontWeight: "800", fontSize: 16, marginBottom: 6 },
  bannerBody: { color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 20 },
  onlineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151515",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  onlineLabel: { color: "#fff", fontSize: 16, fontWeight: "700" },
  membership: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 4 },
  busyBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  busyBadgeText: { color: "#111", fontWeight: "900", fontSize: 11 },
  earnCard: {
    backgroundColor: "#151515",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  earnRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  earnStat: {
    flex: 1,
    backgroundColor: "#1c1c1c",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  earnValue: { color: GOLD, fontSize: 16, fontWeight: "800" },
  earnLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 4 },
  referralNote: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 12 },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 10 },
  empty: { color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 12 },
  rideCard: {
    backgroundColor: "#151515",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  rideTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  code: { color: GOLD, fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },
  status: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  hotel: { color: "#fff", fontSize: 15, fontWeight: "700", marginTop: 6 },
  route: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 4 },
  meta: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 6 },
  acceptBtn: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  acceptText: { color: "#111", fontWeight: "800", fontSize: 14 },
  openActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  declineBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  declineText: { color: "rgba(255,255,255,0.75)", fontWeight: "700", fontSize: 14 },
  cancelTripBtn: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  cancelTripText: { color: "#f87171", fontWeight: "800", fontSize: 14 },
  statusBtn: {
    marginTop: 10,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  statusBtnText: { color: GOLD, fontWeight: "800", fontSize: 14 },
  completedActions: { marginTop: 10, gap: 8 },
  smallBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  smallBtnAlt: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  smallBtnText: { color: "#111", fontWeight: "800", fontSize: 13 },
});
