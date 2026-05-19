import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Platform,
  Animated,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "../../contexts/AuthContext";
import { getReservations, Reservation, getFleetVehicles, type FleetVehicleDto } from "../../services/api";
import { useReservationStream } from "../../hooks/useReservationStream";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ACCENT = "#C9A063";
const ACCENT_DARK = "#A67C32";
const SLATE_900 = "#0f172a";
const SLATE_600 = "#475569";
const SLATE_400 = "#94a3b8";

const trustPoints = [
  { id: "1", icon: "shield-checkmark-outline" as const, title: "Licensed & insured", desc: "Vetted professional chauffeurs" },
  { id: "2", icon: "diamond-outline" as const, title: "5-star service", desc: "Premium standards, every ride" },
  { id: "3", icon: "headset-outline" as const, title: "24/7 concierge", desc: "Real people, anytime you call" },
];

function displayFullName(first?: string | null, last?: string | null): string {
  const full = [first, last].filter((s) => s?.trim()).join(" ").trim();
  return full || "there";
}

/** First segment of address; short airport-style tokens shown uppercase for readability */
function formatPlaceShort(loc: string): string {
  const raw = loc.split(",")[0]?.trim() || loc;
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, " ").trim();
  if (compact.length <= 5 && /^[a-z]+$/i.test(compact.replace(/\s/g, ""))) {
    return compact.toUpperCase();
  }
  return compact.replace(/\b\w/g, (c) => c.toUpperCase());
}

const ACTIVE_TRIP_STATUSES = new Set(["ACCEPTED", "ON THE WAY", "ARRIVED", "CIC", "STOP"]);

export default function CustomerHomeScreen() {
  const { user } = useAuth();
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(16), []);
  // iOS-style spring scale on the hero press.
  const heroScale = useRef(new Animated.Value(1)).current;
  // Subtle breathing on the hero CTA arrow.
  const heroArrowAnim = useRef(new Animated.Value(0)).current;
  // Press feedback + live-dot pulse for the chauffeur status card.
  const liveScale = useRef(new Animated.Value(1)).current;
  const livePulse = useRef(new Animated.Value(0.45)).current;
  const [activeRide, setActiveRide] = useState<Reservation | null>(null);
  const [fleetPreview, setFleetPreview] = useState<FleetVehicleDto[]>([]);
  const [fleetLoading, setFleetLoading] = useState(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Gentle, looped horizontal breath on the hero arrow — communicates "tap me"
  // without being noisy. Eased so it feels Apple-like rather than mechanical.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(heroArrowAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(heroArrowAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [heroArrowAnim]);

  const handleHeroPressIn = useCallback(() => {
    Animated.spring(heroScale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  }, [heroScale]);
  const handleHeroPressOut = useCallback(() => {
    Animated.spring(heroScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  }, [heroScale]);

  const heroArrowTranslate = heroArrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });

  // Pulsing dot on the chauffeur-status card — runs whenever a ride is active.
  useEffect(() => {
    if (!activeRide) {
      livePulse.stopAnimation();
      livePulse.setValue(0.45);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 0.45, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [activeRide, livePulse]);

  const handleLivePressIn = useCallback(() => {
    Animated.spring(liveScale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  }, [liveScale]);
  const handleLivePressOut = useCallback(() => {
    Animated.spring(liveScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 5,
    }).start();
  }, [liveScale]);

  const friendlyStatus = (s: string) => (s === "ACCEPTED" ? "Driver assigned" : s === "CIC" ? "In car" : s);

  const loadFleetPreview = useCallback(async () => {
    setFleetLoading(true);
    try {
      const { vehicles } = await getFleetVehicles();
      setFleetPreview(vehicles.slice(0, 8));
    } catch {
      setFleetPreview([]);
    } finally {
      setFleetLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFleetPreview();
      (async () => {
        try {
          const data = await getReservations();
          if (data.success) {
            const active = data.reservations.find((r) => ACTIVE_TRIP_STATUSES.has(r.status));
            setActiveRide(active || null);
          }
        } catch {
          setActiveRide(null);
        }
      })();
    }, [loadFleetPreview])
  );

  // Live-update the active-ride pill via SSE so the status reflects driver
  // changes instantly while the home screen is open.
  const liveBookingId = activeRide?.bookingId ?? null;
  const liveActive = useReservationStream(liveBookingId);
  useEffect(() => {
    const next = liveActive.data;
    if (!next || !activeRide) return;
    if (next.status === activeRide.status) return;
    if (!ACTIVE_TRIP_STATUSES.has(next.status)) {
      setActiveRide(null);
      return;
    }
    setActiveRide({ ...activeRide, status: next.status });
  }, [liveActive.data, activeRide]);

  return (
    <LinearGradient colors={["#f1f4f9", "#fafbfc", "#ffffff"]} locations={[0, 0.38, 1]} style={styles.gradientFill}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar barStyle="dark-content" />

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <Animated.View style={[styles.topBar, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity style={styles.profileTap} activeOpacity={0.85} onPress={() => router.push("/customer/profile")}>
              <View style={styles.avatarWrap}>
                {user?.photo ? (
                  <Image source={{ uri: user.photo }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitials}>
                      {(user?.firstName?.[0] || "S")}
                      {(user?.lastName?.[0] || "")}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.greetingBlock}>
                <Text style={styles.greetingLine} numberOfLines={1} ellipsizeMode="tail">
                  <Text style={styles.greetingHi}>Hi, </Text>
                  <Text style={styles.greetingName}>{displayFullName(user?.firstName, user?.lastName)}</Text>
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.topActions}>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} onPress={() => router.push("/customer/reservations")}>
                <Ionicons name="calendar-outline" size={22} color={SLATE_900} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} onPress={() => router.push("/customer/profile")}>
                <Ionicons name="notifications-outline" size={22} color={SLATE_900} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Active ride — slim live status card */}
          {activeRide ? (
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: liveScale }],
              }}
            >
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/customer/track-ride", params: { bookingId: activeRide.bookingId } })
                }
                onPressIn={handleLivePressIn}
                onPressOut={handleLivePressOut}
                android_ripple={{ color: "rgba(16,185,129,0.10)", borderless: false, radius: 220 }}
              >
                <View style={styles.liveCard}>
                  {/* Row 1 — eyebrow + status */}
                  <View style={styles.liveTopRow}>
                    <View style={styles.liveDotWrap}>
                      <Animated.View style={[styles.liveDotHalo, { opacity: livePulse }]} />
                      <View style={styles.liveDot} />
                    </View>
                    <Text style={styles.liveEyebrow} numberOfLines={1}>
                      Your Chauffeur Status
                    </Text>
                    <View style={styles.liveStatusChip}>
                      <Text style={styles.liveStatusChipText} numberOfLines={1}>
                        {friendlyStatus(activeRide.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.liveDivider} />

                  {/* Row 2 — route + track */}
                  <View style={styles.liveBottomRow}>
                    <View style={styles.liveRouteCol}>
                      <Text style={styles.liveRouteText} numberOfLines={1}>
                        <Text style={styles.liveRoutePlace}>{formatPlaceShort(activeRide.pickupLocation)}</Text>
                        <Text style={styles.liveRouteArrow}>  →  </Text>
                        <Text style={styles.liveRoutePlace}>{formatPlaceShort(activeRide.dropoffLocation)}</Text>
                      </Text>
                      <Text style={styles.liveBookingMono} numberOfLines={1}>
                        {activeRide.bookingId}
                      </Text>
                    </View>
                    <View style={styles.liveTrackBtn}>
                      <Text style={styles.liveTrackBtnText}>Track</Text>
                      <Ionicons name="chevron-forward" size={14} color={ACCENT_DARK} />
                    </View>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          ) : null}

          {/* Hero CTA */}
          <Animated.View
            style={[
              styles.heroWrap,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: heroScale }],
              },
            ]}
          >
            <Pressable
              onPress={() => router.push("/customer/create-reservation")}
              onPressIn={handleHeroPressIn}
              onPressOut={handleHeroPressOut}
              android_ripple={{ color: "rgba(201,160,99,0.08)", borderless: false, radius: 220 }}
            >
              <View style={styles.heroCard}>
                <LinearGradient
                  colors={["#0E172A", "#0A1120", "#070B14"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* Very subtle gold ambient on the CTA side only */}
                <LinearGradient
                  colors={["rgba(201,160,99,0.18)", "rgba(201,160,99,0)"]}
                  start={{ x: 1, y: 0.4 }}
                  end={{ x: 0.4, y: 0.7 }}
                  style={styles.heroGlow}
                  pointerEvents="none"
                />
                {/* iOS glass top edge */}
                <View style={styles.heroTopHairline} pointerEvents="none" />

                <View style={styles.heroInner}>
                  <View style={styles.heroCopy}>
                    <Text style={styles.heroKicker}>CHAUFFEUR SERVICE</Text>
                    <Text style={styles.heroTitle} numberOfLines={1} ellipsizeMode="tail">
                      Reserve your next ride
                    </Text>
                    <Text style={styles.heroSub} numberOfLines={1} ellipsizeMode="tail">
                      Airport · hourly · point-to-point
                    </Text>
                  </View>

                  <View style={styles.heroCtaOuter}>
                    <BlurView intensity={Platform.OS === "ios" ? 32 : 0} tint="dark" style={styles.heroCtaGlass}>
                      <LinearGradient
                        colors={["#E2B772", ACCENT, ACCENT_DARK]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCtaDisc}
                      >
                        <Animated.View style={{ transform: [{ translateX: heroArrowTranslate }] }}>
                          <Ionicons name="arrow-forward" size={16} color="#fff" />
                        </Animated.View>
                      </LinearGradient>
                    </BlurView>
                  </View>
                </View>
              </View>
            </Pressable>
          </Animated.View>

          {/* Fleet */}
          <Animated.View style={[styles.sectionBlock, { opacity: fadeAnim }]}>
            <View style={styles.sectionHeadingRow}>
              <View>
                <Text style={styles.sectionEyebrow}>FLEET</Text>
                <Text style={styles.sectionTitle}>Premium vehicles</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/customer/create-reservation")} hitSlop={12}>
                <Text style={styles.linkText}>Book a vehicle</Text>
              </TouchableOpacity>
            </View>

            {fleetLoading ? (
              <View style={styles.fleetLoading}>
                <ActivityIndicator color={ACCENT} />
                <Text style={styles.fleetLoadingText}>Loading fleet…</Text>
              </View>
            ) : fleetPreview.length === 0 ? (
              <Text style={styles.fleetEmpty}>Fleet preview unavailable. You can still book from the next step.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fleetScroll}
                decelerationRate="fast"
              >
                {fleetPreview.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.fleetCard}
                    activeOpacity={0.92}
                    onPress={() =>
                      router.push({
                        pathname: "/customer/create-reservation",
                        params: { vehicleId: v.id },
                      })
                    }
                  >
                    <Image source={{ uri: v.imageUrl }} style={styles.fleetImage} resizeMode="cover" />
                    <LinearGradient colors={["transparent", "rgba(15,23,42,0.92)"]} style={styles.fleetOverlay} />
                    <View style={styles.fleetTag}>
                      <Text style={styles.fleetTagText}>{v.category}</Text>
                    </View>
                    <View style={styles.fleetInfo}>
                      <Text style={styles.fleetName} numberOfLines={2}>
                        {v.name}
                      </Text>
                      <View style={styles.fleetMeta}>
                        <Text style={styles.fleetPrice}>
                          ${v.pricePerKm.toFixed(2)}
                          <Text style={styles.fleetPriceUnit}>/km</Text>
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Animated.View>

          {/* Trust */}
          <Animated.View style={[styles.sectionBlock, { opacity: fadeAnim, paddingBottom: 8 }]}>
            <View style={styles.trustHeadingRow}>
              <View>
                <Text style={styles.sectionEyebrow}>WHY SARJ</Text>
                <Text style={styles.trustSectionTitle}>The chauffeur standard</Text>
              </View>
              <View style={styles.trustHeadingMark} />
            </View>
            <View style={styles.trustCard}>
              {trustPoints.map((item, index) => (
                <View key={item.id} style={styles.trustRow}>
                  <View style={styles.trustIconTile}>
                    <Ionicons name={item.icon} size={15} color={ACCENT_DARK} />
                  </View>
                  <View style={styles.trustCopyCol}>
                    <Text style={styles.trustTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.trustDesc} numberOfLines={1}>{item.desc}</Text>
                  </View>
                  {index < trustPoints.length - 1 ? (
                    <View style={styles.trustRowDivider} pointerEvents="none" />
                  ) : null}
                </View>
              ))}
            </View>
          </Animated.View>

          <Text style={styles.footerBrand}></Text>
          <View style={{ height: 96 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientFill: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
    paddingTop: 4,
  },
  profileTap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatarWrap: {
    borderRadius: 26,
    padding: 2,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: ACCENT,
  },
  avatarFallback: {
    backgroundColor: ACCENT,
    justifyContent: "center",
    alignItems: "center",
    borderColor: ACCENT,
  },
  avatarInitials: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  greetingBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  greetingLine: {
    fontSize: 16,
    lineHeight: 21,
  },
  greetingHi: {
    color: SLATE_600,
    fontWeight: "600",
    fontSize: 16,
  },
  greetingName: {
    color: SLATE_900,
    fontWeight: "700",
    fontSize: 16,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },

  liveCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
      },
      android: { elevation: 2 },
    }),
  },
  liveTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveDotWrap: {
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  liveDotHalo: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(16,185,129,0.35)",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  liveEyebrow: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: "700",
    color: SLATE_600,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  liveStatusChip: {
    flexShrink: 0,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(16, 185, 129, 0.28)",
  },
  liveStatusChipText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#047857",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  liveDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(15,23,42,0.08)",
    marginVertical: 10,
  },
  liveBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  liveRouteCol: {
    flex: 1,
    minWidth: 0,
  },
  liveRouteText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: SLATE_900,
    letterSpacing: -0.1,
  },
  liveRoutePlace: {
    color: SLATE_900,
  },
  liveRouteArrow: {
    color: SLATE_400,
    fontWeight: "500",
  },
  liveBookingMono: {
    marginTop: 2,
    fontSize: 10.5,
    fontWeight: "600",
    color: SLATE_400,
    letterSpacing: 0.4,
    ...Platform.select({
      ios: { fontFamily: "Menlo" },
      android: { fontFamily: "monospace" },
    }),
  },
  liveTrackBtn: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(201,160,99,0.10)",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(201,160,99,0.30)",
  },
  liveTrackBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: ACCENT_DARK,
    letterSpacing: 0.2,
  },

  heroWrap: {
    marginBottom: 24,
  },
  heroCard: {
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#0A1120",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.05)",
    ...Platform.select({
      ios: {
        shadowColor: "#020617",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 22,
      },
      android: { elevation: 6 },
    }),
  },
  heroGlow: {
    position: "absolute",
    top: -30,
    right: -40,
    width: 200,
    height: 160,
    borderRadius: 200,
  },
  heroTopHairline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  heroInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(201,160,99,0.85)",
    letterSpacing: 2,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  heroSub: {
    fontSize: 12,
    color: "rgba(226, 232, 240, 0.55)",
    lineHeight: 16,
    marginTop: 3,
    letterSpacing: 0.1,
  },
  heroCtaOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: ACCENT_DARK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  heroCtaGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  heroCtaDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  sectionBlock: {
    marginBottom: 28,
  },
  sectionHeading: {
    marginBottom: 14,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: SLATE_400,
    letterSpacing: 2,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: SLATE_900,
    letterSpacing: -0.4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT_DARK,
  },

  fleetLoading: {
    paddingVertical: 28,
    alignItems: "center",
    gap: 10,
  },
  fleetLoadingText: {
    fontSize: 13,
    color: SLATE_600,
  },
  fleetEmpty: {
    fontSize: 13,
    color: SLATE_600,
    lineHeight: 20,
  },
  fleetScroll: {
    paddingRight: 8,
    gap: 12,
  },
  fleetCard: {
    width: SCREEN_WIDTH * 0.58,
    height: 200,
    borderRadius: 18,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
      },
      android: { elevation: 5 },
    }),
  },
  fleetImage: {
    ...StyleSheet.absoluteFillObject,
  },
  fleetOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  fleetTag: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fleetTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: SLATE_900,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  fleetInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  fleetName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
    lineHeight: 20,
  },
  fleetMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fleetPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: ACCENT,
  },
  fleetPriceUnit: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },

  trustHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  trustSectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: SLATE_900,
    letterSpacing: -0.3,
  },
  trustHeadingMark: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: ACCENT,
    opacity: 0.85,
    marginBottom: 6,
  },
  trustCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: { elevation: 1 },
    }),
  },
  trustRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  trustRowDivider: {
    position: "absolute",
    left: 14 + 28 + 12,
    right: 14,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(15,23,42,0.08)",
  },
  trustIconTile: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(201,160,99,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(201,160,99,0.30)",
    justifyContent: "center",
    alignItems: "center",
  },
  trustCopyCol: {
    flex: 1,
    minWidth: 0,
  },
  trustTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    color: SLATE_900,
    letterSpacing: -0.1,
    marginBottom: 1,
  },
  trustDesc: {
    fontSize: 11.5,
    color: SLATE_600,
    lineHeight: 15,
    letterSpacing: 0.05,
  },

  footerBrand: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: SLATE_400,
    letterSpacing: 2,
    marginTop: 8,
  },
});
