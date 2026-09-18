import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  Platform,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentSheet } from "@stripe/stripe-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useCustomerTheme } from "../../contexts/CustomerThemeContext";
import {
  createCustomerSetupIntent,
  deleteCustomerPaymentMethod,
  getCustomerPaymentMethods,
  type SavedPaymentMethod,
} from "../../services/api";
import { SlimSpinner } from "../../components/SlimSpinner";
import { GOLD } from "../../theme/driver-theme";

function brandLabel(brand: string) {
  const b = brand.toLowerCase();
  if (b === "visa") return "Visa";
  if (b === "mastercard") return "Mastercard";
  if (b === "amex") return "Amex";
  if (b === "discover") return "Discover";
  return brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "Card";
}

function brandIcon(brand: string): keyof typeof Ionicons.glyphMap {
  return "card-outline";
}

export default function PaymentMethodsScreen() {
  const { user } = useAuth();
  const { palette } = useCustomerTheme();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
  const cardBlur = Platform.OS === "ios" ? 36 : 22;

  const [cards, setCards] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getCustomerPaymentMethods();
      if (!res.success) {
        setError(res.error || "Could not load payment methods.");
        setCards([]);
        return;
      }
      setCards(res.paymentMethods || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load payment methods.");
      setCards([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const handleAddCard = async () => {
    try {
      setAdding(true);
      const setup = await createCustomerSetupIntent();
      if (
        !setup.success ||
        !setup.setupIntentClientSecret ||
        !setup.customerId ||
        !setup.ephemeralKeySecret
      ) {
        Alert.alert("Add card", setup.error || "Could not start card setup. Please try again.");
        return;
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "SARJ Worldwide",
        setupIntentClientSecret: setup.setupIntentClientSecret,
        customerId: setup.customerId,
        customerEphemeralKeySecret: setup.ephemeralKeySecret,
        defaultBillingDetails: {
          name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined,
          email: user?.email || undefined,
          phone: user?.phone || undefined,
        },
        returnURL: "sarjworldwide://stripe-redirect",
        appearance: {
          colors: {
            primary: GOLD,
          },
        },
      });
      if (initError) {
        Alert.alert(
          "Add card",
          initError.message?.includes("publishable")
            ? "Payments are not configured on this build. Please update the app or try again later."
            : initError.message || "Could not open secure card form."
        );
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== "Canceled") {
          Alert.alert("Add card", presentError.message || "Card was not saved.");
        }
        return;
      }

      Alert.alert("Card saved", "Your card is stored securely and ready for bookings.");
      await load();
    } catch (e: unknown) {
      Alert.alert(
        "Add card",
        e instanceof Error ? e.message : "Something went wrong. Please try again."
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = (card: SavedPaymentMethod) => {
    Alert.alert(
      "Remove card",
      `Remove ${brandLabel(card.brand)} •••• ${card.last4}? You can add it again anytime.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                setRemovingId(card.id);
                const res = await deleteCustomerPaymentMethod(card.id);
                if (!res.success) {
                  Alert.alert("Remove card", res.error || "Could not remove this card.");
                  return;
                }
                setCards((prev) => prev.filter((c) => c.id !== card.id));
              } catch (e: unknown) {
                Alert.alert(
                  "Remove card",
                  e instanceof Error ? e.message : "Could not remove this card."
                );
              } finally {
                setRemovingId(null);
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient
        colors={[...palette.bg]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[...palette.glow]}
        style={styles.ambientGlow}
      />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={palette.text} />
          </Pressable>
          <Text style={[styles.topTitle, { color: palette.text }]}>Payment methods</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={GOLD}
              colors={[GOLD]}
            />
          }
        >
          <View style={styles.trustBanner}>
            <Ionicons name="shield-checkmark" size={18} color={GOLD} />
            <Text style={[styles.trustText, { color: palette.muted }]}>
              Cards are encrypted and stored securely by Stripe. SARJ never sees your full card
              number.
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <SlimSpinner size={28} stroke={2} color={GOLD} />
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={[styles.errorText, { color: palette.text }]}>{error}</Text>
              <Pressable onPress={() => void load()} style={styles.retryBtn}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : cards.length === 0 ? (
            <BlurView
              intensity={cardBlur}
              tint={palette.blurTint}
              style={[
                styles.emptyCard,
                {
                  borderColor: palette.border,
                  backgroundColor: Platform.OS === "android" ? palette.cardAndroid : "transparent",
                },
              ]}
            >
              <View style={styles.emptyIconWrap}>
                <Ionicons name="card-outline" size={28} color={GOLD} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No cards yet</Text>
              <Text style={[styles.emptyBody, { color: palette.muted }]}>
                Add a card once — then pay for rides in one tap at checkout.
              </Text>
            </BlurView>
          ) : (
            <View style={styles.list}>
              {cards.map((card) => (
                <BlurView
                  key={card.id}
                  intensity={cardBlur}
                  tint={palette.blurTint}
                  style={[
                    styles.cardRow,
                    {
                      borderColor: palette.border,
                      backgroundColor:
                        Platform.OS === "android" ? palette.cardAndroid : "transparent",
                    },
                  ]}
                >
                  <View style={styles.cardIcon}>
                    <Ionicons name={brandIcon(card.brand)} size={20} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: palette.text }]}>
                      {brandLabel(card.brand)} •••• {card.last4}
                    </Text>
                    <Text style={[styles.cardSub, { color: palette.muted }]}>
                      {card.expMonth && card.expYear
                        ? `Expires ${String(card.expMonth).padStart(2, "0")}/${String(
                            card.expYear
                          ).slice(-2)}`
                        : "Saved securely"}
                      {card.isDefault ? " · Default" : ""}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleRemove(card)}
                    disabled={removingId === card.id}
                    hitSlop={8}
                    style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                  >
                    {removingId === card.id ? (
                      <SlimSpinner size={16} stroke={2} color={palette.muted} />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color="#B91C1C" />
                    )}
                  </Pressable>
                </BlurView>
              ))}
            </View>
          )}

          <Pressable
            onPress={() => void handleAddCard()}
            disabled={adding || loading}
            style={({ pressed }) => [styles.addWrap, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={["#E8C078", GOLD, "#B8862E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addGradient}
            >
              {adding ? (
                <SlimSpinner size={18} stroke={2} color="#1A1208" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={18} color="#1A1208" />
                  <Text style={styles.addText}>Add card</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.secureRow}>
            <Ionicons name="lock-closed" size={12} color={palette.muted} />
            <Text style={[styles.secureCopy, { color: palette.muted }]}>
              Secured by Stripe · PCI DSS compliant
            </Text>
          </View>
        </ScrollView>
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
    height: 220,
  },
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  trustBanner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  trustText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  centerBox: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(212,160,74,0.18)",
  },
  retryText: {
    color: GOLD,
    fontWeight: "700",
    fontSize: 13,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 28,
    alignItems: "center",
    overflow: "hidden",
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(212,160,74,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  list: { gap: 10 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(212,160,74,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  removeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  addWrap: {
    marginTop: 20,
    borderRadius: 14,
    overflow: "hidden",
  },
  addGradient: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1208",
    letterSpacing: -0.2,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  secureCopy: {
    fontSize: 11,
    fontWeight: "600",
  },
  pressed: { opacity: 0.88 },
});
