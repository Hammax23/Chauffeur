import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { SavedPaymentMethod } from "../services/api";
import { GOLD } from "../theme/driver-theme";

const ACCENT = "#B89355";
const SELECTED_BG = "#FDF8F2";
const SELECTED_BORDER = "#D4B483";

export function brandLabel(brand: string) {
  const b = brand.toLowerCase();
  if (b === "visa") return "Visa";
  if (b === "mastercard") return "Mastercard";
  if (b === "amex") return "Amex";
  if (b === "discover") return "Discover";
  return brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "Card";
}

/** Brand mark on mini card icon (lower-right). */
function brandTileLabel(brand: string) {
  const b = brand.toLowerCase();
  if (b === "visa") return "VISA";
  if (b === "mastercard") return "MC";
  if (b === "amex") return "AMEX";
  if (b === "discover") return "DISC";
  return (brand || "CARD").slice(0, 4).toUpperCase();
}

function cardFaceColors(brand: string): [string, string, string] {
  const b = brand.toLowerCase();
  if (b === "visa") return ["#1A1F2E", "#0D111A", "#151A24"];
  if (b === "mastercard") return ["#2B1F1A", "#1A1210", "#241C18"];
  if (b === "amex") return ["#0F2744", "#0A1A2E", "#123052"];
  if (b === "discover") return ["#2A1810", "#1A100C", "#301E14"];
  return ["#1C1C1E", "#111113", "#2A2A2C"];
}

/** Realistic mini plastic card: gradient face, gold EMV chip, brand mark. */
function MiniCardIcon({ brand }: { brand: string }) {
  const label = brandTileLabel(brand);
  const colors = cardFaceColors(brand);
  return (
    <View style={styles.miniCardOuter}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.miniCard}
      >
        {/* Soft gloss */}
        <LinearGradient
          colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.02)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 0.9 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.miniCardTop}>
          <LinearGradient
            colors={["#F0D78C", "#C9A063", "#A67C3D"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.miniChip}
          >
            <View style={styles.miniChipInner}>
              <View style={styles.miniChipH} />
              <View style={styles.miniChipV} />
            </View>
          </LinearGradient>
          {/* Contactless arcs */}
          <View style={styles.contactless}>
            <View style={[styles.arc, styles.arc1]} />
            <View style={[styles.arc, styles.arc2]} />
            <View style={[styles.arc, styles.arc3]} />
          </View>
        </View>
        <Text
          style={[styles.miniBrand, label.length > 3 && styles.miniBrandSm]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </LinearGradient>
    </View>
  );
}

export function cardShortLabel(card: SavedPaymentMethod) {
  return `${brandLabel(card.brand)} ••${card.last4}`;
}

type Props = {
  cards: SavedPaymentMethod[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddCard: () => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  rowBg?: string;
  isDark?: boolean;
};

/**
 * Screenshot-matched payment method picker (Visa tile · •••• 4242 · gold check).
 */
export function SavedCardPicker({
  cards,
  selectedId,
  onSelect,
  onAddCard,
  loading,
  disabled,
  error,
  textColor,
  mutedColor,
  isDark,
}: Props) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  if (error) {
    return <Text style={styles.err}>{error}</Text>;
  }

  return (
    <View style={styles.wrap}>
      {cards.length === 0 ? (
        <Text style={[styles.empty, { color: mutedColor }]}>
          No card saved yet. Add one to pay in one tap.
        </Text>
      ) : (
        <View style={styles.list}>
          {cards.map((c) => {
            const selected = selectedId === c.id;
            const exp =
              c.expMonth && c.expYear
                ? `Expires ${String(c.expMonth).padStart(2, "0")}/${String(c.expYear).slice(-2)}`
                : "Saved securely";
            return (
              <Pressable
                key={c.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[
                  styles.cardRow,
                  selected
                    ? isDark
                      ? styles.cardRowSelectedDark
                      : styles.cardRowSelected
                    : isDark
                      ? styles.cardRowIdleDark
                      : styles.cardRowIdle,
                ]}
                onPress={() => onSelect(c.id)}
                disabled={!!disabled}
              >
                <MiniCardIcon brand={c.brand} />
                <View style={styles.cardCopy}>
                  <Text style={[styles.cardLast4, { color: textColor }]} numberOfLines={1}>
                    •••• {c.last4}
                  </Text>
                  <Text style={[styles.cardExp, { color: mutedColor }]} numberOfLines={1}>
                    {exp}
                  </Text>
                </View>
                {selected ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={styles.checkCircleIdle} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        onPress={onAddCard}
        disabled={!!disabled}
        style={({ pressed }) => [
          styles.addRow,
          pressed && { opacity: 0.85 },
          disabled && { opacity: 0.5 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add payment method"
      >
        <Ionicons name="add" size={22} color={ACCENT} />
        <Text style={[styles.addText, { color: textColor }]}>Add payment method</Text>
        <Ionicons name="chevron-forward" size={16} color="#C4C4C4" style={styles.addChevron} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  center: { paddingVertical: 20, alignItems: "center" },
  err: { color: "#DC2626", fontSize: 13, marginBottom: 4 },
  empty: { fontSize: 13.5, lineHeight: 19, marginBottom: 8 },
  list: { gap: 10 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  cardRowIdle: {
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "#FAFAFA",
  },
  cardRowIdleDark: {
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  cardRowSelected: {
    borderColor: SELECTED_BORDER,
    backgroundColor: SELECTED_BG,
  },
  cardRowSelectedDark: {
    borderColor: ACCENT,
    backgroundColor: "rgba(184,147,85,0.16)",
  },
  miniCardOuter: {
    width: 56,
    height: 36,
    borderRadius: 9,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.22,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: { elevation: 2 },
    }),
  },
  miniCard: {
    flex: 1,
    paddingHorizontal: 6,
    paddingTop: 5,
    paddingBottom: 4,
    justifyContent: "space-between",
  },
  miniCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  miniChip: {
    width: 14,
    height: 11,
    borderRadius: 2.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  miniChipInner: {
    width: 10,
    height: 8,
    borderRadius: 1.5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(80,50,10,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  miniChipH: {
    position: "absolute",
    left: 1,
    right: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(80,50,10,0.4)",
  },
  miniChipV: {
    position: "absolute",
    top: 1,
    bottom: 1,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(80,50,10,0.4)",
  },
  contactless: {
    width: 12,
    height: 12,
    marginTop: 0,
    alignItems: "flex-end",
    justifyContent: "center",
    opacity: 0.55,
  },
  arc: {
    position: "absolute",
    borderColor: "rgba(255,255,255,0.85)",
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 20,
  },
  arc1: { width: 5, height: 5, right: 0, bottom: 1 },
  arc2: { width: 8, height: 8, right: 0, bottom: 0 },
  arc3: { width: 11, height: 11, right: 0, bottom: -1 },
  miniBrand: {
    alignSelf: "flex-end",
    color: "#FFFFFF",
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 1,
  },
  miniBrandSm: {
    fontSize: 7,
    letterSpacing: 0.2,
  },
  cardCopy: { flex: 1, minWidth: 0 },
  cardLast4: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cardExp: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "500",
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleIdle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "transparent",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 6,
    marginTop: 4,
  },
  addText: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: "500",
  },
  addChevron: {
    marginLeft: "auto",
  },
});
