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
import {
  getCustomerPaymentMethods,
  type SavedPaymentMethod,
} from "../services/api";
import { GOLD } from "../theme/driver-theme";
import { SavedCardPicker } from "./SavedCardPicker";
import { router } from "expo-router";

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

          <SavedCardPicker
            cards={cards}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAddCard={() => {
              onClose();
              router.push("/customer/payment-methods");
            }}
            loading={loading}
            disabled={!!busy}
            error={error}
            textColor={textColor}
            mutedColor={mutedColor}
            borderColor="rgba(0,0,0,0.08)"
          />

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
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
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
