import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GooglePlacesAddressField } from "../../components/GooglePlacesAddressField";
import {
  createConciergeRide,
  type ConciergeGuestPaymentMethod,
  type ConciergeVehicleRequestRule,
} from "../../services/api";

const GOLD = "#D4A04A";

const VEHICLE_OPTIONS: { value: ConciergeVehicleRequestRule; label: string }[] = [
  { value: "SEDAN", label: "Sedan (any eligible)" },
  { value: "SEDAN_ONLY", label: "Sedan Only" },
  { value: "SUV", label: "SUV" },
  { value: "CADILLAC_ONLY", label: "Cadillac Only" },
];

const PAYMENT_OPTIONS: { value: ConciergeGuestPaymentMethod; label: string }[] = [
  { value: "UNSET", label: "Unset" },
  { value: "CASH", label: "Cash (no fee)" },
  { value: "APP", label: "App (+5% fee)" },
];

export default function CreateConciergeRideScreen() {
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [notes, setNotes] = useState("");
  const [vehicleRule, setVehicleRule] = useState<ConciergeVehicleRequestRule>("SEDAN");
  const [payment, setPayment] = useState<ConciergeGuestPaymentMethod>("UNSET");
  const [fare, setFare] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!pickup.trim()) {
      Alert.alert("Required", "Pickup location is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createConciergeRide({
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        pickupLocation: pickup.trim(),
        dropoffLocation: dropoff.trim(),
        notes: notes.trim() || undefined,
        vehicleRequestRule: vehicleRule,
        guestPaymentMethod: payment,
        fare: Math.max(0, Number(fare) || 0),
      });
      if (res.success && res.ride) {
        router.replace(`/concierge/ride/${res.ride.id}`);
      } else {
        Alert.alert("Error", res.error || "Failed to create ride");
      }
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create ride");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </Pressable>
          <Text style={styles.topTitle}>New Guest Ride</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>Guest name</Text>
            <TextInput
              style={styles.input}
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Guest full name"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Guest phone</Text>
            <TextInput
              style={styles.input}
              value={guestPhone}
              onChangeText={setGuestPhone}
              placeholder="Phone number"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Pickup <Text style={styles.req}>*</Text>
            </Text>
            <GooglePlacesAddressField
              value={pickup}
              onChangeText={setPickup}
              placeholder="Pickup address"
              iconName="navigate-outline"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Dropoff</Text>
            <GooglePlacesAddressField
              value={dropoff}
              onChangeText={setDropoff}
              placeholder="Dropoff address"
              iconName="flag-outline"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notes]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Special instructions"
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
            />
          </View>

          <Text style={styles.label}>Vehicle request</Text>
          <View style={styles.chips}>
            {VEHICLE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setVehicleRule(opt.value)}
                style={[styles.chip, vehicleRule === opt.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, vehicleRule === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 8 }]}>Guest payment</Text>
          <View style={styles.chips}>
            {PAYMENT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setPayment(opt.value)}
                style={[styles.chip, payment === opt.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, payment === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.field, { marginTop: 8 }]}>
            <Text style={styles.label}>Fare (CAD)</Text>
            <TextInput
              style={styles.input}
              value={fare}
              onChangeText={setFare}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.submit, submitting && { opacity: 0.7 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Create Request</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  content: { padding: 20, paddingBottom: 48 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#0f172a", marginBottom: 8 },
  req: { color: "#e53935" },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  notes: { minHeight: 88, paddingTop: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  chipActive: { backgroundColor: "#1a1a1a", borderColor: "#1a1a1a" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  chipTextActive: { color: "#fff" },
  submit: {
    backgroundColor: GOLD,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: "#111", fontSize: 16, fontWeight: "800" },
});
