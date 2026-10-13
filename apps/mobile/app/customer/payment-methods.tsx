import { useCallback, useRef, useState } from "react";
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
  ActionSheetIOS,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentSheet } from "@stripe/stripe-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useCustomerTheme } from "../../contexts/CustomerThemeContext";
import {
  createCustomerSetupIntent,
  deleteCustomerPaymentMethod,
  getCustomerPaymentMethods,
  invalidateCustomerPaymentMethodsCache,
  setCustomerDefaultPaymentMethod,
  type SavedPaymentMethod,
} from "../../services/api";
import { SlimSpinner } from "../../components/SlimSpinner";
import { GOLD } from "../../theme/driver-theme";

const CREAM = "#F7F4EF";
const SECTION = "#9A9084";
const MUTED = "#8A8178";
const INK = "#1A1510";
const CARD_BG = "#FFFFFF";
const SECURITY_ICON_BG = "#E8F5E9";
const SECURITY_ICON = "#2E7D32";
const ADD_ICON_BG = "#F0E6D4";
const ADD_ICON = "#8B6914";
const DEFAULT_BADGE = "#C9A96E";

function brandLabel(brand: string) {
  const b = brand.toLowerCase();
  if (b === "visa") return "Visa";
  if (b === "mastercard") return "Mastercard";
  if (b === "amex") return "Amex";
  if (b === "discover") return "Discover";
  return brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "Card";
}

function brandMark(brand: string) {
  const b = brand.toLowerCase();
  if (b === "visa") return "VISA";
  if (b === "mastercard") return "Mastercard";
  if (b === "amex") return "AMEX";
  if (b === "discover") return "DISCOVER";
  return (brand || "CARD").toUpperCase();
}

function cardFaceColors(brand: string): [string, string, string] {
  const b = brand.toLowerCase();
  if (b === "visa") return ["#2A2A2E", "#1A1A1E", "#121214"];
  if (b === "mastercard") return ["#2B1F1A", "#1A1210", "#241C18"];
  if (b === "amex") return ["#0F2744", "#0A1A2E", "#123052"];
  if (b === "discover") return ["#2A1810", "#1A100C", "#301E14"];
  return ["#1C1C1E", "#111113", "#2A2A2C"];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function PlasticCard({
  card,
  busy,
  onMenu,
}: {
  card: SavedPaymentMethod;
  busy: boolean;
  onMenu: () => void;
}) {
  const colors = cardFaceColors(card.brand);
  const exp =
    card.expMonth && card.expYear
      ? `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`
      : "——";
  const mark = brandMark(card.brand);

  return (
    <View style={styles.plasticOuter}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.plasticFace}
      >
        {/* Concentric arcs — top right */}
        <View style={styles.arcsWrap} pointerEvents="none">
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.arcRing,
                {
                  width: 120 + i * 36,
                  height: 120 + i * 36,
                  borderRadius: 60 + i * 18,
                  opacity: 0.07 + i * 0.015,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.plasticTop}>
          {card.isDefault ? (
            <View style={styles.defaultBadge}>
              <Ionicons name="checkmark" size={11} color="#1A1208" />
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          ) : (
            <View />
          )}
          <Pressable
            onPress={onMenu}
            hitSlop={12}
            disabled={busy}
            style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.7 }]}
            accessibilityLabel="Card options"
          >
            {busy ? (
              <SlimSpinner size={14} stroke={2} color="#FFFFFF" />
            ) : (
              <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
            )}
          </Pressable>
        </View>

        <LinearGradient
          colors={["#F0D78C", "#C9A063", "#A67C3D"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emvChip}
        >
          <View style={styles.emvInner}>
            <View style={styles.emvH} />
            <View style={styles.emvV} />
          </View>
        </LinearGradient>

        <Text style={styles.panText}>••••  ••••  ••••  {card.last4}</Text>

        <View style={styles.plasticBottom}>
          <View>
            <Text style={styles.expLabel}>EXPIRES</Text>
            <Text style={styles.expValue}>{exp}</Text>
          </View>
          <Text
            style={[
              styles.brandMark,
              mark.length > 5 && styles.brandMarkSm,
            ]}
            numberOfLines={1}
          >
            {mark}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function SecurityRow({
  icon,
  title,
  subtitle,
  last,
  titleColor,
  subColor,
  dividerColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  last?: boolean;
  titleColor: string;
  subColor: string;
  dividerColor: string;
}) {
  return (
    <View
      style={[
        styles.securityRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor },
      ]}
    >
      <View style={styles.securityIcon}>
        <Ionicons name={icon} size={16} color={SECURITY_ICON} />
      </View>
      <View style={styles.securityCopy}>
        <Text style={[styles.securityTitle, { color: titleColor }]}>{title}</Text>
        <Text style={[styles.securitySub, { color: subColor }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

export default function PaymentMethodsScreen() {
  const { user } = useAuth();
  const { palette, isDark } = useCustomerTheme();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

  const [cards, setCards] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [defaultingId, setDefaultingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSeq = useRef(0);
  const addingRef = useRef(false);
  const cardsRef = useRef<SavedPaymentMethod[]>([]);
  cardsRef.current = cards;

  const bg = isDark ? palette.root : CREAM;
  const text = isDark ? palette.text : INK;
  const muted = isDark ? palette.muted : MUTED;
  const section = isDark ? palette.muted : SECTION;
  const surface = isDark ? "rgba(255,255,255,0.06)" : CARD_BG;
  const surfaceBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.04)";

  const load = useCallback(
    async (opts?: {
      silent?: boolean;
      retries?: number;
      expectCard?: boolean;
    }): Promise<SavedPaymentMethod[] | null> => {
      const seq = ++loadSeq.current;
      const silent = opts?.silent === true;
      const retries = Math.max(0, opts?.retries ?? 0);
      const expectCard = opts?.expectCard === true;
      const hadCards = cardsRef.current.length > 0;

      if (!silent && !hadCards) {
        setLoading(true);
      }
      if (!silent) setError(null);

      try {
        let lastError: string | null = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
          if (seq !== loadSeq.current) return null;

          try {
            const res = await getCustomerPaymentMethods({
              force: expectCard || attempt > 0 || !silent,
            });
            if (seq !== loadSeq.current) return null;

            if (!res.success) {
              lastError = res.error || "Could not load payment methods.";
              if (attempt < retries) {
                await sleep(350 * (attempt + 1));
                continue;
              }
              if (cardsRef.current.length > 0) {
                setError(null);
                return cardsRef.current;
              }
              setError(lastError);
              setCards([]);
              return [];
            }

            const list = res.paymentMethods || [];
            if (expectCard && list.length === 0 && attempt < retries) {
              await sleep(400 * (attempt + 1));
              continue;
            }

            setError(null);
            setCards(list);
            cardsRef.current = list;
            return list;
          } catch (e: unknown) {
            lastError =
              e instanceof Error ? e.message : "Could not load payment methods.";
            if (attempt < retries) {
              await sleep(350 * (attempt + 1));
              continue;
            }
            if (cardsRef.current.length > 0) {
              setError(null);
              return cardsRef.current;
            }
            setError(lastError);
            setCards([]);
            return [];
          }
        }
        return cardsRef.current;
      } finally {
        if (seq === loadSeq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      if (addingRef.current) return;
      void load({ silent: true, retries: 0 });
    }, [load])
  );

  const handleAddCard = async () => {
    try {
      addingRef.current = true;
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

      invalidateCustomerPaymentMethodsCache();
      const list = (await load({ retries: 3, expectCard: true })) || [];

      if (list.length === 1 && !list[0].isDefault) {
        try {
          await setCustomerDefaultPaymentMethod(list[0].id);
          invalidateCustomerPaymentMethodsCache();
          setCards((prev) =>
            prev.map((c) => ({ ...c, isDefault: c.id === list[0].id }))
          );
        } catch {
          // Non-fatal
        }
      }

      Alert.alert("Card saved", "Your card is stored securely and ready for bookings.");
    } catch (e: unknown) {
      Alert.alert(
        "Add card",
        e instanceof Error ? e.message : "Something went wrong. Please try again."
      );
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  const handleSetDefault = (card: SavedPaymentMethod) => {
    if (card.isDefault) return;
    void (async () => {
      try {
        setDefaultingId(card.id);
        const res = await setCustomerDefaultPaymentMethod(card.id);
        if (!res.success) {
          Alert.alert("Default card", res.error || "Could not set default card.");
          return;
        }
        setCards((prev) =>
          prev.map((c) => ({ ...c, isDefault: c.id === card.id }))
        );
      } catch (e: unknown) {
        Alert.alert(
          "Default card",
          e instanceof Error ? e.message : "Could not set default card."
        );
      } finally {
        setDefaultingId(null);
      }
    })();
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
                invalidateCustomerPaymentMethodsCache();
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

  const openCardMenu = (card: SavedPaymentMethod) => {
    const options = card.isDefault
      ? ["Remove card", "Cancel"]
      : ["Set as default", "Remove card", "Cancel"];
    const cancelButtonIndex = options.length - 1;
    const destructiveButtonIndex = options.indexOf("Remove card");

    const run = (index: number) => {
      const choice = options[index];
      if (choice === "Set as default") handleSetDefault(card);
      if (choice === "Remove card") handleRemove(card);
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          title: `${brandLabel(card.brand)} •••• ${card.last4}`,
        },
        (index) => {
          if (typeof index === "number") run(index);
        }
      );
    } else {
      Alert.alert(
        `${brandLabel(card.brand)} •••• ${card.last4}`,
        undefined,
        [
          ...(!card.isDefault
            ? [{ text: "Set as default", onPress: () => handleSetDefault(card) }]
            : []),
          {
            text: "Remove card",
            style: "destructive" as const,
            onPress: () => handleRemove(card),
          },
          { text: "Cancel", style: "cancel" as const },
        ]
      );
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={bg}
      />
      {!isDark ? null : (
        <>
          <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={[...palette.glow]} style={styles.ambientGlow} />
        </>
      )}
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={24} color={text} />
          </Pressable>
          <Text style={[styles.topTitle, { color: text }]}>Payment methods</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
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
          <Text style={[styles.sectionLabel, { color: section }]}>SAVED CARDS</Text>

          {loading ? (
            <View style={styles.centerBox}>
              <SlimSpinner size={28} stroke={2} color={GOLD} />
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={[styles.errorText, { color: text }]}>{error}</Text>
              <Pressable onPress={() => void load()} style={styles.retryBtn}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : cards.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: surface, borderColor: surfaceBorder },
              ]}
            >
              <View style={styles.emptyIconWrap}>
                <Ionicons name="card-outline" size={26} color={GOLD} />
              </View>
              <Text style={[styles.emptyTitle, { color: text }]}>No cards yet</Text>
              <Text style={[styles.emptyBody, { color: muted }]}>
                Add a card to pay for bookings in one tap.
              </Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {cards.map((card) => (
                <PlasticCard
                  key={card.id}
                  card={card}
                  busy={removingId === card.id || defaultingId === card.id}
                  onMenu={() => openCardMenu(card)}
                />
              ))}
            </View>
          )}

          <Pressable
            onPress={() => void handleAddCard()}
            disabled={adding || loading}
            style={({ pressed }) => [
              styles.addRow,
              {
                backgroundColor: surface,
                borderColor: surfaceBorder,
                opacity: adding || loading ? 0.6 : pressed ? 0.92 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add payment method"
          >
            <View style={styles.addIcon}>
              {adding ? (
                <SlimSpinner size={16} stroke={2} color={ADD_ICON} />
              ) : (
                <Ionicons name="add" size={20} color={ADD_ICON} />
              )}
            </View>
            <View style={styles.addCopy}>
              <Text style={[styles.addTitle, { color: text }]}>Add payment method</Text>
              <Text style={[styles.addSub, { color: muted }]}>Credit or debit card</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C4BBB0" />
          </Pressable>

          <Text style={[styles.sectionLabel, styles.sectionSpaced, { color: section }]}>
            SECURITY
          </Text>
          <View
            style={[
              styles.securityCard,
              { backgroundColor: surface, borderColor: surfaceBorder },
            ]}
          >
            <SecurityRow
              icon="lock-closed"
              title="Encrypted by Stripe"
              subtitle="PCI DSS Level 1 certified provider"
              titleColor={text}
              subColor={muted}
              dividerColor={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
            />
            <SecurityRow
              icon="eye-off"
              title="Full card number never shared"
              subtitle="SARJ only sees the last 4 digits"
              titleColor={text}
              subColor={muted}
              dividerColor={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
            />
            <SecurityRow
              icon="shield-checkmark"
              title="You stay in control"
              subtitle="Remove or change your card anytime"
              titleColor={text}
              subColor={muted}
              dividerColor={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
              last
            />
          </View>

          <View style={styles.footer}>
            <View style={styles.brandBadges}>
              {(["VISA", "Mastercard", "Amex"] as const).map((label) => (
                <View
                  key={label}
                  style={[
                    styles.brandBadge,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
                      borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.brandBadgeText,
                      label === "VISA" && styles.brandVisa,
                      label === "Mastercard" && styles.brandMc,
                      label === "Amex" && styles.brandAmex,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.secureRow}>
              <Ionicons name="lock-closed" size={11} color={muted} />
              <Text style={[styles.secureCopy, { color: muted }]}>
                Payments secured by Stripe
              </Text>
            </View>
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
    paddingBottom: 10,
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
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionSpaced: {
    marginTop: 28,
  },
  centerBox: {
    paddingVertical: 40,
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
    marginBottom: 14,
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
  cardList: {
    gap: 14,
    marginBottom: 14,
  },
  plasticOuter: {
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 6 },
    }),
  },
  plasticFace: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    minHeight: 188,
    overflow: "hidden",
  },
  arcsWrap: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  arcRing: {
    position: "absolute",
    borderWidth: 1.2,
    borderColor: "#FFFFFF",
  },
  plasticTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
    zIndex: 1,
  },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: DEFAULT_BADGE,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1A1208",
    letterSpacing: 0.1,
  },
  menuBtn: {
    width: 32,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emvChip: {
    width: 38,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    overflow: "hidden",
  },
  emvInner: {
    width: 28,
    height: 20,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(80,50,10,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  emvH: {
    position: "absolute",
    left: 2,
    right: 2,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(80,50,10,0.45)",
  },
  emvV: {
    position: "absolute",
    top: 2,
    bottom: 2,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(80,50,10,0.45)",
  },
  panText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 1.6,
    marginBottom: 22,
  },
  plasticBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  expLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 3,
  },
  expValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  brandMark: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1.5,
    fontStyle: "italic",
  },
  brandMarkSm: {
    fontSize: 15,
    fontStyle: "normal",
    letterSpacing: 0.6,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
    }),
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ADD_ICON_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  addCopy: { flex: 1 },
  addTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  addSub: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 2,
  },
  securityCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
    }),
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  securityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SECURITY_ICON_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  securityCopy: { flex: 1 },
  securityTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  securitySub: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 2,
    lineHeight: 17,
  },
  footer: {
    marginTop: 32,
    alignItems: "center",
    gap: 14,
  },
  brandBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  brandVisa: { color: "#1A1F71" },
  brandMc: { color: "#EB001B" },
  brandAmex: { color: "#006FCF" },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  secureCopy: {
    fontSize: 11.5,
    fontWeight: "500",
  },
  pressed: { opacity: 0.88 },
});
