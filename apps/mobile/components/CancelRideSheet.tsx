import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Reservation } from "../services/api";
import { useCustomerTheme } from "../contexts/CustomerThemeContext";
import { GOLD } from "../theme/driver-theme";

export const CANCEL_REASONS = [
  "Plans changed",
  "Booked by mistake",
  "Chauffeur is taking too long",
  "Found another ride",
  "Other",
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number];

const REGULAR_FREE_MINUTES = 120;
const LD_FREE_HOURS = 24;
const LD_HALF_HOURS = 12;
const LD_KM_THRESHOLD = 100;

function parsePickupDate(r: Reservation): Date | null {
  const dateRaw = (r.serviceDate || "").trim();
  const timeRaw = (r.serviceTime || "").trim();
  if (!dateRaw) return null;

  let hours = 12;
  let minutes = 0;
  const ampm = timeRaw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const h24 = timeRaw.match(/^(\d{1,2}):(\d{2})$/);
  if (ampm) {
    hours = parseInt(ampm[1], 10) % 12;
    if (ampm[3].toUpperCase() === "PM") hours += 12;
    minutes = parseInt(ampm[2], 10);
  } else if (h24) {
    hours = parseInt(h24[1], 10);
    minutes = parseInt(h24[2], 10);
  }

  const base = dateRaw.includes("T")
    ? new Date(dateRaw)
    : new Date(`${dateRaw}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  if (Number.isNaN(base.getTime())) return null;
  if (!dateRaw.includes("T")) {
    base.setHours(hours, minutes, 0, 0);
  }
  return base;
}

function parseDistanceKm(distance?: string): number | null {
  const raw = String(distance || "").trim();
  if (!raw) return null;
  const m = raw.match(/([\d.]+)\s*(km|mi)?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  if ((m[2] || "").toLowerCase() === "mi") return n * 1.60934;
  return n;
}

export function getCancelPolicy(r: Reservation): {
  freeUntil: Date | null;
  freeUntilLabel: string;
  fee: number;
  refundPercent: number;
  keepPercent: number;
  label: string;
  canCancelOnline: boolean;
  isLongDistance: boolean;
} {
  const pickup = parsePickupDate(r);
  const km = parseDistanceKm(r.distance);
  const isLongDistance =
    r.isLongDistance === true || (km != null && km >= LD_KM_THRESHOLD);

  const canCancelOnline = r.status === "PENDING" || r.status === "ACCEPTED";
  const total = Number(r.total) || 0;
  const now = Date.now();

  if (r.cancelPolicy) {
    const freeUntil = r.cancelPolicy.freeUntil
      ? new Date(r.cancelPolicy.freeUntil)
      : pickup
        ? new Date(
            pickup.getTime() -
              (isLongDistance ? LD_FREE_HOURS * 3600 * 1000 : REGULAR_FREE_MINUTES * 60 * 1000)
          )
        : null;
    const freeUntilLabel = freeUntil
      ? freeUntil.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
    const keepPercent = r.cancelPolicy.keepPercent;
    return {
      freeUntil,
      freeUntilLabel,
      fee: (total * keepPercent) / 100,
      refundPercent: r.cancelPolicy.refundPercent,
      keepPercent,
      label: r.cancelPolicy.label,
      canCancelOnline,
      isLongDistance,
    };
  }

  if (!pickup) {
    return {
      freeUntil: null,
      freeUntilLabel: "",
      fee: total,
      refundPercent: 0,
      keepPercent: 100,
      label: "Cancellation charges may apply",
      canCancelOnline,
      isLongDistance,
    };
  }

  const hoursUntil = (pickup.getTime() - now) / (3600 * 1000);
  const minutesUntil = (pickup.getTime() - now) / 60000;

  if (isLongDistance) {
    const freeUntil = new Date(pickup.getTime() - LD_FREE_HOURS * 3600 * 1000);
    const freeUntilLabel = freeUntil.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    if (hoursUntil >= LD_FREE_HOURS) {
      return {
        freeUntil,
        freeUntilLabel,
        fee: 0,
        refundPercent: 100,
        keepPercent: 0,
        label: "Free cancel (24+ hours before pickup)",
        canCancelOnline,
        isLongDistance: true,
      };
    }
    if (hoursUntil >= LD_HALF_HOURS) {
      return {
        freeUntil,
        freeUntilLabel,
        fee: total * 0.5,
        refundPercent: 50,
        keepPercent: 50,
        label: "50% charge (12–24 hours before pickup)",
        canCancelOnline,
        isLongDistance: true,
      };
    }
    return {
      freeUntil,
      freeUntilLabel,
      fee: total,
      refundPercent: 0,
      keepPercent: 100,
      label: "Full charge (under 12 hours before pickup)",
      canCancelOnline,
      isLongDistance: true,
    };
  }

  const freeUntil = new Date(pickup.getTime() - REGULAR_FREE_MINUTES * 60 * 1000);
  const freeUntilLabel = freeUntil.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const isFree = minutesUntil >= REGULAR_FREE_MINUTES;
  return {
    freeUntil,
    freeUntilLabel,
    fee: isFree ? 0 : total,
    refundPercent: isFree ? 100 : 0,
    keepPercent: isFree ? 0 : 100,
    label: isFree
      ? "Free cancel (2+ hours before pickup)"
      : "Full charge (less than 2 hours before pickup)",
    canCancelOnline,
    isLongDistance: false,
  };
}

type Props = {
  visible: boolean;
  reservation: Reservation | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: CancelReason) => void;
};

export function CancelRideSheet({
  visible,
  reservation,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useCustomerTheme();
  const [reason, setReason] = useState<CancelReason>("Plans changed");

  useEffect(() => {
    if (visible) setReason("Plans changed");
  }, [visible, reservation?.bookingId]);

  const policy = useMemo(
    () => (reservation ? getCancelPolicy(reservation) : null),
    [reservation]
  );

  if (!reservation || !policy) return null;

  const subtitle = policy.label
    ? `${policy.label}${
        policy.freeUntilLabel && policy.keepPercent === 0
          ? ` Free until ${policy.freeUntilLabel}.`
          : ""
      } Tell us why so we can improve.`
    : "Tell us why so we can improve.";

  const sheetBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const handleColor = isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.18)";
  const rowBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const rowBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const rowOnBorder = GOLD;
  const rowOnBg = isDark ? "rgba(212,160,74,0.12)" : "rgba(212,160,74,0.1)";
  const keepBg = isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6";
  const keepBorder = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              borderColor: palette.border,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: handleColor }]} />

          <Text style={[styles.title, { color: palette.text }]}>Cancel this ride?</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>{subtitle}</Text>

          {policy.keepPercent > 0 ? (
            <View
              style={[
                styles.feeBanner,
                { backgroundColor: keepBg, borderColor: keepBorder },
              ]}
            >
              <Text style={[styles.feeTitle, { color: palette.text }]}>
                {policy.keepPercent >= 100
                  ? "Full fare will be kept"
                  : `${policy.keepPercent}% of fare will be kept`}
              </Text>
              <Text style={[styles.feeAmount, { color: GOLD }]}>
                ${policy.fee.toFixed(2)} CAD
              </Text>
              {policy.refundPercent > 0 ? (
                <Text style={[styles.feeHint, { color: palette.muted }]}>
                  {policy.refundPercent}% refunded to your card
                </Text>
              ) : (
                <Text style={[styles.feeHint, { color: palette.muted }]}>
                  No refund — per Sarj cancellation policy
                </Text>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.feeBanner,
                { backgroundColor: keepBg, borderColor: keepBorder },
              ]}
            >
              <Text style={[styles.feeTitle, { color: palette.text }]}>Full refund</Text>
              <Text style={[styles.feeHint, { color: palette.muted }]}>
                Your payment will be returned to your card
              </Text>
            </View>
          )}

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {CANCEL_REASONS.map((item) => {
              const selected = reason === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setReason(item)}
                  disabled={busy}
                  style={[
                    styles.reasonRow,
                    {
                      backgroundColor: selected ? rowOnBg : rowBg,
                      borderColor: selected ? rowOnBorder : rowBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.reasonText,
                      { color: selected ? palette.text : palette.textSecondary },
                      selected && styles.reasonTextOn,
                    ]}
                  >
                    {item}
                  </Text>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected ? GOLD : palette.muted,
                        backgroundColor: selected ? GOLD : "transparent",
                      },
                    ]}
                  >
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={busy}
              style={[styles.btnSecondary, { borderColor: palette.border }]}
            >
              <Text style={[styles.btnSecondaryText, { color: palette.text }]}>Keep ride</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(reason)}
              disabled={busy}
              style={[styles.btnDanger, busy && { opacity: 0.7 }]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnDangerText}>Cancel ride</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "88%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: 6, marginBottom: 12 },
  feeBanner: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 12,
  },
  feeTitle: { fontSize: 14, fontWeight: "700" },
  feeAmount: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  feeHint: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  list: { maxHeight: 220 },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  reasonText: { fontSize: 15, fontWeight: "600", flex: 1, paddingRight: 10 },
  reasonTextOn: { fontWeight: "700" },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1A1208" },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  btnSecondary: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnSecondaryText: { fontSize: 15, fontWeight: "700" },
  btnDanger: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#B91C1C",
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDangerText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
