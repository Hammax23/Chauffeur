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

/** Free cancel until this many minutes before pickup (airport / point-to-point policy). */
const FREE_CANCEL_LEAD_MINUTES = 120;

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

export function getCancelPolicy(r: Reservation): {
  freeUntil: Date | null;
  freeUntilLabel: string;
  fee: number;
  canCancelOnline: boolean;
} {
  const pickup = parsePickupDate(r);
  const freeUntil = pickup
    ? new Date(pickup.getTime() - FREE_CANCEL_LEAD_MINUTES * 60 * 1000)
    : null;
  const now = Date.now();
  const isFree = !freeUntil || now < freeUntil.getTime();
  const canCancelOnline =
    r.status === "PENDING" || r.status === "ACCEPTED";

  const freeUntilLabel = freeUntil
    ? freeUntil.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return {
    freeUntil,
    freeUntilLabel,
    fee: isFree ? 0 : Number(r.total) || 0,
    canCancelOnline,
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

  const subtitle = policy.freeUntilLabel
    ? `Free cancellation until ${policy.freeUntilLabel}. Tell us why so we can improve.`
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

          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: palette.muted }]}>Cancellation fee</Text>
            <Text
              style={[
                styles.feeValue,
                { color: policy.fee <= 0 ? "#34C759" : palette.danger },
              ]}
            >
              ${policy.fee.toFixed(2)}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.btn,
                styles.btnKeep,
                { backgroundColor: keepBg, borderColor: keepBorder },
              ]}
              onPress={onClose}
              disabled={busy}
            >
              <Text style={[styles.btnKeepText, { color: palette.text }]}>Keep ride</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnCancel, busy && { opacity: 0.7 }]}
              onPress={() => onConfirm(reason)}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={palette.danger} />
              ) : (
                <Text style={[styles.btnCancelText, { color: palette.danger }]}>
                  Cancel ride
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "92%",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 18,
  },
  list: {
    maxHeight: 340,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  reasonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  reasonTextOn: {
    fontWeight: "700",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1A1208",
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    paddingBottom: 16,
  },
  feeLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  feeValue: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnKeep: {
    borderWidth: 1,
  },
  btnKeepText: {
    fontSize: 16,
    fontWeight: "700",
  },
  btnCancel: {
    backgroundColor: "rgba(255,69,58,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.35)",
  },
  btnCancelText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
