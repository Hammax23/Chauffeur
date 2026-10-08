import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getCustomerPaymentMethods,
  type SavedPaymentMethod,
} from "../services/api";
import { GOLD } from "../theme/driver-theme";

function brandLabel(brand: string) {
  const b = brand.toLowerCase();
  if (b === "visa") return "Visa";
  if (b === "mastercard") return "Mastercard";
  if (b === "amex") return "Amex";
  if (b === "discover") return "Discover";
  return brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "Card";
}

type Props = {
  visible: boolean;
  amount: number;
  busy?: boolean;
  onClose: () => void;
  onPay: (paymentMethodId: string | undefined) => void;
  textColor?: string;
  mutedColor?: string;
  surfaceColor?: string;
};

/**
 * Enterprise Pay-now sheet: pick any saved card (default highlighted), then charge.
 */
export function PayOutstandingSheet({
  visible,
  amount,
  busy,
  onClose,
  onPay,
  textColor = "#1a1a1a",
  mutedColor = "#6b7280",
  surfaceColor = "#fff",
}: Props) {
  const [cards, setCards] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await getCustomerPaymentMethods();
        if (cancelled) return;
        if (!res.success) {
          setError(res.error || "Could not load cards");
          setCards([]);
          return;
        }
        const list = res.paymentMethods || [];
        setCards(list);
        const def = list.find((c) => c.isDefault) || list[0];
        setSelectedId(def?.id || null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load cards");
          setCards([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: surfaceColor }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={[styles.title, { color: textColor }]}>Pay outstanding</Text>
          <Text style={[styles.sub, { color: mutedColor }]}>
            Charge ${amount.toFixed(2)} CAD to a saved card
          </Text>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={GOLD} />
            </View>
          ) : error ? (
            <Text style={styles.err}>{error}</Text>
          ) : cards.length === 0 ? (
            <Text style={[styles.empty, { color: mutedColor }]}>
              No saved cards. Add a card under Payment methods, then try again.
            </Text>
          ) : (
            <View style={styles.list}>
              {cards.map((c) => {
                const selected = selectedId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.cardRow,
                      selected && { borderColor: GOLD, backgroundColor: "rgba(201,160,99,0.08)" },
                    ]}
                    onPress={() => setSelectedId(c.id)}
                    disabled={!!busy}
                  >
                    <Ionicons
                      name={selected ? "radio-button-on" : "radio-button-off"}
                      size={22}
                      color={selected ? GOLD : mutedColor}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: textColor }]}>
                        {brandLabel(c.brand)} ···· {c.last4}
                        {c.isDefault ? "  · Default" : ""}
                      </Text>
                      {c.expMonth && c.expYear ? (
                        <Text style={[styles.cardMeta, { color: mutedColor }]}>
                          Exp {String(c.expMonth).padStart(2, "0")}/{c.expYear}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.actions}>
            <Pressable
              style={[styles.btnGhost, busy && { opacity: 0.5 }]}
              onPress={onClose}
              disabled={!!busy}
            >
              <Text style={[styles.btnGhostText, { color: mutedColor }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, (busy || !selectedId) && { opacity: 0.5 }]}
              disabled={!!busy || !selectedId}
              onPress={() => onPay(selectedId || undefined)}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Pay now</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "80%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  sub: { fontSize: 14, marginBottom: 16 },
  center: { paddingVertical: 28, alignItems: "center" },
  err: { color: "#DC2626", marginBottom: 12 },
  empty: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  list: { gap: 8, marginBottom: 16 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
  },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardMeta: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: "row", gap: 10 },
  btnGhost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  btnGhostText: { fontSize: 15, fontWeight: "600" },
  btnPrimary: {
    flex: 1.2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: GOLD,
  },
  btnPrimaryText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
