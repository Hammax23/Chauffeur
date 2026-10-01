import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { getReservationById, hideReservationFromHistory, type Reservation } from "../../services/api";
import { useCustomerTheme } from "../../contexts/CustomerThemeContext";
import { SlimSpinner } from "../../components/SlimSpinner";
import { GOLD } from "../../theme/driver-theme";
import { isParcelServiceType } from "../../utils/parcel";
import {
  buildReservationInvoiceHtml,
  invoiceFileName,
} from "../../utils/reservation-invoice";

/** Live trip only — PENDING/ACCEPTED stay on this detail screen. */
const IN_PROGRESS = new Set(["ON THE WAY", "ARRIVED", "CIC", "STOP"]);

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  return s.trim();
}

function money(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return `$${Number(n).toFixed(2)}`;
}

/** Customer-facing status (never show raw PENDING). */
function customerStatusLabel(r: Reservation): {
  label: string;
  tone: "confirmed" | "assigned" | "live" | "done" | "cancelled";
} {
  if (r.status === "DONE") return { label: "Completed", tone: "done" };
  if (r.status === "CANCELLED" || r.status === "CANCELED") {
    return { label: "Cancelled", tone: "cancelled" };
  }
  if (!r.driver) return { label: "Confirmed", tone: "confirmed" };
  switch (r.status) {
    case "ON THE WAY":
      return { label: "On the way", tone: "live" };
    case "ARRIVED":
      return { label: "Arrived", tone: "live" };
    case "CIC":
      return { label: "In trip", tone: "live" };
    case "STOP":
      return { label: "Stop", tone: "live" };
    default:
      return { label: "Chauffeur assigned", tone: "assigned" };
  }
}

export default function TripDetailScreen() {
  const { palette, isDark } = useCustomerTheme();
  const cardBlur = Platform.OS === "ios" ? 36 : 22;
  const params = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const bookingId =
    typeof params.bookingId === "string"
      ? params.bookingId
      : Array.isArray(params.bookingId)
        ? params.bookingId[0]
        : "";

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [hiding, setHiding] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getReservationById(bookingId);
      if (!data.success || !data.reservation) {
        Alert.alert("Unavailable", "Could not load this trip.", [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }
      const r = data.reservation;
      if (IN_PROGRESS.has(r.status)) {
        router.replace({
          pathname: "/customer/track-ride",
          params: { bookingId: r.bookingId },
        });
        return;
      }
      setReservation(r);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const isDone = reservation?.status === "DONE";
  const isCancelled =
    reservation?.status === "CANCELLED" || reservation?.status === "CANCELED";
  const canHideFromHistory = Boolean(isDone || isCancelled);
  const statusUi = reservation ? customerStatusLabel(reservation) : null;

  const confirmHideFromHistory = () => {
    if (!reservation || hiding) return;
    Alert.alert(
      "Remove from History?",
      "This hides the trip from your History list only. It does not delete the booking from SARJ records (needed for receipts, billing, and support).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setHiding(true);
              try {
                const res = await hideReservationFromHistory(reservation.bookingId);
                if (!res.ok || !res.data.success) {
                  Alert.alert("Unable to remove", res.data.error || "Please try again.");
                  return;
                }
                Alert.alert("Removed", "This trip no longer appears in your History.", [
                  { text: "OK", onPress: () => router.replace("/customer/history") },
                ]);
              } catch (e) {
                Alert.alert(
                  "Unable to remove",
                  e instanceof Error ? e.message : "Please try again."
                );
              } finally {
                setHiding(false);
              }
            })();
          },
        },
      ]
    );
  };

  const downloadInvoice = async () => {
    if (!reservation || invoiceBusy) return;
    setInvoiceBusy(true);
    try {
      const html = buildReservationInvoiceHtml(reservation);
      const printed = await Print.printToFileAsync({ html, base64: false });
      const fileName = invoiceFileName(reservation.bookingId);
      const destUri = `${FileSystem.cacheDirectory ?? ""}${fileName}`;
      let shareUri = printed.uri;
      try {
        const info = await FileSystem.getInfoAsync(destUri);
        if (info.exists) {
          await FileSystem.deleteAsync(destUri, { idempotent: true });
        }
        await FileSystem.copyAsync({ from: printed.uri, to: destUri });
        shareUri = destUri;
      } catch {
        // Fall back to print cache URI if rename/copy fails
        shareUri = printed.uri;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          "Invoice ready",
          "PDF was created, but sharing/download isn’t available on this device."
        );
        return;
      }
      await Sharing.shareAsync(shareUri, {
        mimeType: "application/pdf",
        dialogTitle: fileName,
        UTI: "com.adobe.pdf",
      });
    } catch (e) {
      Alert.alert(
        "Unable to download",
        e instanceof Error ? e.message : "Could not create the invoice PDF."
      );
    } finally {
      setInvoiceBusy(false);
    }
  };

  const reportIssue = () => {
    if (!reservation) return;
    router.push({
      pathname: "/customer/contact-us",
      params: {
        type: "Booking Issue",
        subject: `Issue with booking ${reservation.bookingId}`,
        bookingId: reservation.bookingId,
      },
    });
  };

  const stops = (reservation?.stops || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const fareRows: { label: string; value: string }[] = [];
  if (reservation) {
    const ride = money(reservation.rideFare);
    const sub = money(reservation.subtotal);
    const hst = money(reservation.hst);
    const tip = money(reservation.gratuity);
    const total = money(reservation.total);
    if (ride) fareRows.push({ label: "Ride fare", value: ride });
    if (sub && sub !== ride) fareRows.push({ label: "Subtotal", value: sub });
    if (hst && Number(reservation.hst) > 0) fareRows.push({ label: "HST", value: hst });
    if (tip && Number(reservation.gratuity) > 0) {
      fareRows.push({ label: "Gratuity", value: tip });
    }
    if (total) fareRows.push({ label: "Total", value: `${total} CAD` });
  }

  const showReceiptActions = Boolean(isDone || isCancelled);
  const fareSectionLabel = showReceiptActions ? "RECEIPT" : "FARE";

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
      <View style={styles.ambientGlow} pointerEvents="none">
        <LinearGradient
          colors={[...palette.glow]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.85, y: 0.5 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color={palette.text} />
            <Text style={[styles.backText, { color: palette.text }]}>Back</Text>
          </Pressable>
          <Text style={[styles.topTitle, { color: palette.text }]}>Trip details</Text>
          <View style={{ width: 64 }} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <SlimSpinner size={32} stroke={2} color={GOLD} />
          </View>
        ) : !reservation ? null : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <BlurView
              intensity={cardBlur}
              tint={palette.blurTint}
              style={[
                styles.card,
                {
                  borderColor: palette.border,
                  backgroundColor:
                    Platform.OS === "android" ? palette.cardAndroid : "transparent",
                },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.bookingId}>{reservation.bookingId}</Text>
                {statusUi ? (
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          statusUi.tone === "done"
                            ? "rgba(52,199,89,0.14)"
                            : statusUi.tone === "cancelled"
                              ? "rgba(255,69,58,0.12)"
                              : statusUi.tone === "confirmed"
                                ? isDark
                                  ? "rgba(52,199,89,0.16)"
                                  : "rgba(22,163,74,0.12)"
                                : statusUi.tone === "live"
                                  ? isDark
                                    ? "rgba(10,132,255,0.18)"
                                    : "rgba(37,99,235,0.12)"
                                  : palette.hintBg,
                        borderColor:
                          statusUi.tone === "done"
                            ? "rgba(52,199,89,0.4)"
                            : statusUi.tone === "cancelled"
                              ? "rgba(255,69,58,0.35)"
                              : statusUi.tone === "confirmed"
                                ? isDark
                                  ? "rgba(52,199,89,0.35)"
                                  : "rgba(22,163,74,0.28)"
                                : statusUi.tone === "live"
                                  ? isDark
                                    ? "rgba(10,132,255,0.35)"
                                    : "rgba(37,99,235,0.28)"
                                  : palette.hintBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            statusUi.tone === "done"
                              ? "#34C759"
                              : statusUi.tone === "cancelled"
                                ? "#FF453A"
                                : statusUi.tone === "confirmed"
                                  ? isDark
                                    ? "#34C759"
                                    : "#15803D"
                                  : statusUi.tone === "live"
                                    ? isDark
                                      ? "#64D2FF"
                                      : "#1D4ED8"
                                    : isDark
                                      ? "#E8C078"
                                      : "#7A5A28",
                        },
                      ]}
                    >
                      {statusUi.label}
                    </Text>
                  </View>
                ) : null}
              </View>

              {reservation.vehicle ? (
                <Text style={[styles.vehicleName, { color: palette.text }]} numberOfLines={2}>
                  {reservation.vehicle}
                </Text>
              ) : null}

              <View style={styles.chipRow}>
                <View
                  style={[
                    styles.metaChip,
                    { backgroundColor: palette.metaChipBg, borderColor: palette.border },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={13} color={GOLD} />
                  <Text style={[styles.metaChipText, { color: palette.metaText }]}>
                    {reservation.serviceDate} · {reservation.serviceTime}
                  </Text>
                </View>
                <View
                  style={[
                    styles.metaChip,
                    { backgroundColor: palette.metaChipBg, borderColor: palette.border },
                  ]}
                >
                  <Ionicons
                    name={
                      isParcelServiceType(reservation.serviceType)
                        ? "cube-outline"
                        : "people-outline"
                    }
                    size={13}
                    color={GOLD}
                  />
                  <Text style={[styles.metaChipText, { color: palette.metaText }]}>
                    {isParcelServiceType(reservation.serviceType)
                      ? "Parcel"
                      : `${reservation.passengers} pax`}
                  </Text>
                </View>
              </View>
            </BlurView>

            <Text style={[styles.sectionLabel, { color: palette.muted }]}>ROUTE</Text>
            <BlurView
              intensity={cardBlur}
              tint={palette.blurTint}
              style={[
                styles.card,
                {
                  borderColor: palette.border,
                  backgroundColor:
                    Platform.OS === "android" ? palette.cardAndroid : "transparent",
                },
              ]}
            >
              <View style={styles.routeCard}>
                <View style={styles.routeRail}>
                  <View style={[styles.routeDot, { backgroundColor: "#34C759" }]} />
                  <View style={[styles.routeLine, { backgroundColor: palette.routeLine }]} />
                  {stops.map((_, i) => (
                    <View key={`stop-rail-${i}`}>
                      <View style={[styles.routeDot, { backgroundColor: GOLD }]} />
                      <View style={[styles.routeLine, { backgroundColor: palette.routeLine }]} />
                    </View>
                  ))}
                  <View style={[styles.routeDot, { backgroundColor: "#FF453A" }]} />
                </View>
                <View style={styles.routeCopy}>
                  <View style={styles.routeBlock}>
                    <Text style={[styles.routeLabel, { color: palette.muted }]}>PICKUP</Text>
                    <Text style={[styles.locationText, { color: palette.location }]}>
                      {shortLoc(reservation.pickupLocation)}
                    </Text>
                  </View>
                  {stops.map((stop, i) => (
                    <View key={`stop-${i}`} style={styles.routeBlock}>
                      <Text style={[styles.routeLabel, { color: palette.muted }]}>
                        STOP {i + 1}
                      </Text>
                      <Text style={[styles.locationText, { color: palette.location }]}>
                        {shortLoc(stop)}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.routeBlock}>
                    <Text style={[styles.routeLabel, { color: palette.muted }]}>DROPOFF</Text>
                    <Text style={[styles.locationText, { color: palette.location }]}>
                      {shortLoc(reservation.dropoffLocation)}
                    </Text>
                  </View>
                </View>
              </View>
            </BlurView>

            {reservation.driver ? (
              <>
                <Text style={[styles.sectionLabel, { color: palette.muted }]}>CHAUFFEUR</Text>
                <BlurView
                  intensity={cardBlur}
                  tint={palette.blurTint}
                  style={[
                    styles.card,
                    {
                      borderColor: palette.border,
                      backgroundColor:
                        Platform.OS === "android" ? palette.cardAndroid : "transparent",
                    },
                  ]}
                >
                  <View style={styles.driverRow}>
                    {reservation.driver.photo ? (
                      <Image
                        source={{ uri: reservation.driver.photo }}
                        style={styles.driverPhoto}
                      />
                    ) : (
                      <View
                        style={[
                          styles.driverPhoto,
                          styles.driverPhotoFallback,
                          { backgroundColor: isDark ? "#1a1a1a" : "#0f172a" },
                        ]}
                      >
                        <Text style={styles.driverLetter}>
                          {reservation.driver.name?.[0] || "D"}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.driverName, { color: palette.text }]}>
                        {reservation.driver.name}
                      </Text>
                      {reservation.driver.vehiclePlate ? (
                        <Text style={[styles.driverMeta, { color: palette.muted }]}>
                          {reservation.driver.vehiclePlate}
                        </Text>
                      ) : null}
                    </View>
                    {reservation.driver.rating != null ? (
                      <View style={styles.ratingPill}>
                        <Ionicons name="star" size={12} color={GOLD} />
                        <Text style={[styles.ratingText, { color: palette.text }]}>
                          {Number(reservation.driver.rating).toFixed(1)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </BlurView>
              </>
            ) : null}

            {fareRows.length > 0 ? (
              <>
                <Text style={[styles.sectionLabel, { color: palette.muted }]}>
                  {fareSectionLabel}
                </Text>
                <BlurView
                  intensity={cardBlur}
                  tint={palette.blurTint}
                  style={[
                    styles.card,
                    {
                      borderColor: palette.border,
                      backgroundColor:
                        Platform.OS === "android" ? palette.cardAndroid : "transparent",
                    },
                  ]}
                >
                  {fareRows.map((row, i) => {
                    const isTotal = row.label === "Total";
                    return (
                      <View
                        key={row.label}
                        style={[
                          styles.fareRow,
                          i < fareRows.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: palette.border,
                            marginBottom: 10,
                            paddingBottom: 10,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.fareLabel,
                            { color: isTotal ? palette.text : palette.muted },
                            isTotal && { fontWeight: "700" },
                          ]}
                        >
                          {row.label}
                        </Text>
                        <Text
                          style={[
                            styles.fareValue,
                            { color: isTotal ? GOLD : palette.text },
                            isTotal && { fontWeight: "800" },
                          ]}
                        >
                          {row.value}
                        </Text>
                      </View>
                    );
                  })}
                </BlurView>
              </>
            ) : null}

            {showReceiptActions ? (
              <View style={styles.receiptActions}>
                <Pressable
                  onPress={() => void downloadInvoice()}
                  disabled={invoiceBusy}
                  style={({ pressed }) => [
                    styles.receiptActionBtn,
                    {
                      borderColor: palette.border,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.03)",
                      opacity: invoiceBusy ? 0.7 : 1,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  {invoiceBusy ? (
                    <SlimSpinner size={16} stroke={2} color={palette.text} />
                  ) : (
                    <Text style={[styles.receiptActionText, { color: palette.text }]}>
                      Download invoice
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={reportIssue}
                  style={({ pressed }) => [
                    styles.receiptActionBtn,
                    {
                      borderColor: palette.border,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.03)",
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.receiptActionText, { color: palette.text }]}>
                    Report an issue
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {isDone && reservation.driver ? (
              reservation.review ? (
                <View style={styles.reviewedBlock}>
                  <View style={styles.reviewedStars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons
                        key={n}
                        name={n <= (reservation.review?.stars ?? 0) ? "star" : "star-outline"}
                        size={16}
                        color={GOLD}
                      />
                    ))}
                  </View>
                  <Text style={[styles.reviewedText, { color: palette.muted }]}>
                    You rated this trip
                  </Text>
                  {reservation.review.comment ? (
                    <Text style={[styles.reviewComment, { color: palette.text }]}>
                      {reservation.review.comment}
                    </Text>
                  ) : null}
                </View>
              ) : reservation.canReview !== false ? (
                <Pressable
                  style={({ pressed }) => [styles.rateBtn, pressed && styles.pressed]}
                  onPress={() =>
                    router.push({
                      pathname: "/customer/rate-driver",
                      params: { bookingId: reservation.bookingId },
                    })
                  }
                >
                  <Ionicons name="star-outline" size={16} color="#1A1208" />
                  <Text style={styles.rateBtnText}>Rate chauffeur</Text>
                </Pressable>
              ) : null
            ) : null}

            {canHideFromHistory ? (
              <Pressable
                style={({ pressed }) => [
                  styles.hideHistoryBtn,
                  { borderColor: "rgba(255,69,58,0.35)" },
                  pressed && styles.pressed,
                ]}
                onPress={confirmHideFromHistory}
                disabled={hiding}
              >
                {hiding ? (
                  <SlimSpinner size={18} stroke={2} color="#FF453A" />
                ) : (
                  <Ionicons name="trash-outline" size={18} color="#FF453A" />
                )}
                <Text style={styles.hideHistoryText}>Remove from History</Text>
              </Pressable>
            ) : null}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  ambientGlow: {
    position: "absolute",
    top: -40,
    left: -20,
    right: -20,
    height: 240,
  },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { flexDirection: "row", alignItems: "center", width: 64 },
  backText: { fontSize: 15, marginLeft: 2 },
  topTitle: { fontSize: 16, fontWeight: "700" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 18, paddingBottom: 24, gap: 12 },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  bookingId: { flex: 1, fontSize: 13, color: GOLD, fontWeight: "700" },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  vehicleName: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaChipText: { fontSize: 12, fontWeight: "500" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: -4,
    marginLeft: 4,
  },
  routeCard: { flexDirection: "row", gap: 12 },
  routeRail: { width: 14, alignItems: "center", paddingVertical: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { flex: 1, width: 2, marginVertical: 4, borderRadius: 1, minHeight: 16 },
  routeCopy: { flex: 1, gap: 14 },
  routeBlock: { gap: 3 },
  routeLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.1 },
  locationText: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  driverPhoto: { width: 48, height: 48, borderRadius: 24 },
  driverPhotoFallback: { alignItems: "center", justifyContent: "center" },
  driverLetter: { color: GOLD, fontSize: 18, fontWeight: "700" },
  driverName: { fontSize: 16, fontWeight: "700" },
  driverMeta: { fontSize: 13, marginTop: 2 },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(212,160,74,0.14)",
  },
  ratingText: { fontSize: 13, fontWeight: "700" },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fareLabel: { fontSize: 14 },
  fareValue: { fontSize: 14, fontWeight: "600" },
  reviewedBlock: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  reviewedStars: { flexDirection: "row", gap: 4 },
  reviewedText: { fontSize: 13, fontWeight: "500" },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: GOLD,
    marginTop: 4,
  },
  rateBtnText: { fontSize: 14, fontWeight: "800", color: "#1A1208" },
  hideHistoryBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,69,58,0.08)",
  },
  hideHistoryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF453A",
  },
  receiptActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  receiptActionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  receiptActionText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.15,
    textAlign: "center",
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
