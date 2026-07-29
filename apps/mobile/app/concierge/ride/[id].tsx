import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getConciergeRide,
  patchConciergeRide,
  createConciergeCheckout,
  getConciergePayWebOrigin,
  type ConciergeRide,
} from "../../../services/api";
import { SlimSpinner } from "../../../components/SlimSpinner";
import * as WebBrowser from "expo-web-browser";

const GOLD = "#D4A04A";

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function ConciergeRideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ride, setRide] = useState<ConciergeRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await getConciergeRide(id);
      if (res.success) setRide(res.ride);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load ride");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const runAction = async (
    body: Parameters<typeof patchConciergeRide>[1],
    confirm?: { title: string; message: string }
  ) => {
    if (!id) return;
    const doIt = async () => {
      setBusy(true);
      try {
        await patchConciergeRide(id, body);
        await load();
      } catch (e: unknown) {
        Alert.alert("Error", e instanceof Error ? e.message : "Action failed");
      } finally {
        setBusy(false);
      }
    };
    if (confirm) {
      Alert.alert(confirm.title, confirm.message, [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => void doIt() },
      ]);
    } else {
      await doIt();
    }
  };

  const rateDriver = () => {
    Alert.alert("Rate driver", "How was this chauffeur?", [
      { text: "Cancel", style: "cancel" },
      { text: "★★★★★", onPress: () => void runAction({ action: "rate", stars: 5 }) },
      { text: "★★★★", onPress: () => void runAction({ action: "rate", stars: 4 }) },
      { text: "★★★", onPress: () => void runAction({ action: "rate", stars: 3 }) },
    ]);
  };

  const payWithStripeDemo = () => {
    if (!id) return;
    Alert.alert(
      "Stripe demo pay",
      "Browser mein Stripe Checkout khulega. Test keys ke sath card 4242… use karo. Live keys real charge karti hain.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Stripe",
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                const res = await createConciergeCheckout(id, getConciergePayWebOrigin());
                if (!res.url) {
                  Alert.alert("Error", "No checkout URL returned");
                  return;
                }
                await WebBrowser.openBrowserAsync(res.url);
                await load();
              } catch (e: unknown) {
                Alert.alert("Stripe error", e instanceof Error ? e.message : "Checkout failed");
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ]
    );
  };

  if (loading && !ride) {
    return (
      <View style={styles.loader}>
        <SlimSpinner size={32} stroke={2} color={GOLD} />
      </View>
    );
  }

  if (!ride) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.missing}>Ride not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const driver = ride.assignedDriverProfile?.driver;
  const canCancel = ride.status === "OPEN" || ride.status === "ASSIGNED";
  const canRate = !!ride.assignedDriverProfile;
  const isDone = ride.status === "COMPLETED";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </Pressable>
        <Text style={styles.topTitle}>{ride.requestCode}</Text>
        <View style={{ width: 36 }} />
      </View>

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
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{String(ride.status).replace(/_/g, " ")}</Text>
        </View>

        <View style={styles.card}>
          <Row label="Guest" value={ride.guestName || "—"} />
          <Row label="Phone" value={ride.guestPhone || "—"} />
          <Row label="Pickup" value={ride.pickupLocation} />
          <Row label="Dropoff" value={ride.dropoffLocation || "—"} />
          <Row label="Vehicle" value={String(ride.vehicleRequestRule || "").replace(/_/g, " ")} />
          <Row label="Payment" value={String(ride.guestPaymentMethod || "UNSET")} />
          <Row label="Fare" value={`$${Number(ride.fare || 0).toFixed(2)}`} />
          <Row
            label="Platform fee (5% App)"
            value={`$${Number(ride.platformFee || 0).toFixed(2)}`}
          />
          <Row label="Hotel commission" value={`$${Number(ride.hotelCommission || 0).toFixed(2)}`} />
          {ride.notes ? <Row label="Notes" value={ride.notes} /> : null}
        </View>

        {driver ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Driver</Text>
            <Row label="Name" value={driver.name} />
            <Row label="Phone" value={driver.phone} />
            <Row label="Vehicle" value={[driver.vehicle, driver.vehiclePlate].filter(Boolean).join(" · ")} />
            {driver.lastLatitude != null && driver.lastLongitude != null ? (
              <Row
                label="Last location"
                value={`${driver.lastLatitude.toFixed(5)}, ${driver.lastLongitude.toFixed(5)}`}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.muted}>Waiting for a driver to accept…</Text>
          </View>
        )}

        {ride.commission ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Commission</Text>
            <Row label="Your claim" value={ride.commission.conciergeClaim} />
            <Row label="Driver claim" value={ride.commission.driverClaim} />
            <Row
              label="Status"
              value={
                ride.commission.disputeOpen
                  ? "Dispute open"
                  : ride.commission.matched
                    ? "Matched"
                    : "Pending"
              }
            />
          </View>
        ) : null}

        {busy ? (
          <ActivityIndicator color={GOLD} style={{ marginVertical: 16 }} />
        ) : (
          <View style={styles.actions}>
            <Text style={styles.actionsLabel}>Guest payment</Text>
            <Pressable
              style={[
                styles.actionBtn,
                ride.guestPaymentMethod === "CASH" && styles.actionSelected,
              ]}
              onPress={() =>
                void runAction({ action: "set_payment", guestPaymentMethod: "CASH" })
              }
            >
              <Text style={styles.actionText}>
                Cash (no platform fee)
                {ride.guestPaymentMethod === "CASH" ? " ✓" : ""}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.stripeBtn]}
              onPress={payWithStripeDemo}
            >
              <Text style={styles.actionText}>Pay with Stripe (demo) · +5%</Text>
            </Pressable>
            {ride.guestPaymentMethod === "APP" ? (
              <Text style={styles.paidHint}>
                App payment recorded · fee ${Number(ride.platformFee || 0).toFixed(2)}
              </Text>
            ) : (
              <Pressable
                style={[styles.actionBtn, styles.actionAlt]}
                onPress={() =>
                  void runAction({ action: "set_payment", guestPaymentMethod: "APP" })
                }
              >
                <Text style={[styles.actionText, styles.actionAltText]}>
                  Mark App paid (manual, no Stripe)
                </Text>
              </Pressable>
            )}

            {isDone ? (
              <>
                <Text style={[styles.actionsLabel, { marginTop: 8 }]}>Hotel commission</Text>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() =>
                    void runAction({ action: "commission", conciergeClaim: "RECEIVED" })
                  }
                >
                  <Text style={styles.actionText}>Commission received</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.actionAlt]}
                  onPress={() =>
                    void runAction({ action: "commission", conciergeClaim: "NOT_RECEIVED" })
                  }
                >
                  <Text style={[styles.actionText, styles.actionAltText]}>Commission not received</Text>
                </Pressable>
                {canRate ? (
                  <Pressable style={styles.actionBtn} onPress={rateDriver}>
                    <Text style={styles.actionText}>Rate driver</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            {canCancel ? (
              <Pressable
                style={[styles.actionBtn, styles.dangerBtn]}
                onPress={() =>
                  void runAction(
                    { action: "cancel" },
                    { title: "Cancel ride?", message: "This will cancel the guest request." }
                  )
                }
              >
                <Text style={[styles.actionText, { color: "#fff" }]}>Cancel request</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  missing: { textAlign: "center", marginTop: 80, color: "#64748b", fontSize: 16 },
  link: { textAlign: "center", marginTop: 12, color: GOLD, fontWeight: "700" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  content: { padding: 20, paddingBottom: 40 },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: { fontSize: 12, fontWeight: "800", color: "#0f172a", textTransform: "uppercase" },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 10 },
  muted: { color: "#94a3b8", fontSize: 14 },
  row: { marginBottom: 10 },
  rowLabel: { fontSize: 12, color: "#94a3b8", fontWeight: "600", marginBottom: 2 },
  rowValue: { fontSize: 15, color: "#0f172a", fontWeight: "500" },
  actions: { gap: 10, marginTop: 8 },
  actionsLabel: { fontSize: 13, fontWeight: "700", color: "#64748b", marginBottom: 2 },
  actionBtn: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionSelected: { backgroundColor: "#2E7D4F" },
  stripeBtn: { backgroundColor: "#635BFF" },
  paidHint: {
    textAlign: "center",
    color: "#059669",
    fontSize: 13,
    fontWeight: "600",
    marginTop: -2,
  },
  actionAlt: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0" },
  actionAltText: { color: "#0f172a" },
  dangerBtn: { backgroundColor: "#dc2626" },
  actionText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
