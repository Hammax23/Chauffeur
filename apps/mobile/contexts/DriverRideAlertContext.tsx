import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Vibration,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useDriverAuth } from "./DriverAuthContext";

export type DriverRideAlert = {
  bookingId: string;
  title: string;
  body: string;
  type: "new_assignment" | "live_offer";
};

type DriverRideAlertContextValue = {
  showRideAlert: (alert: DriverRideAlert) => void;
  dismissRideAlert: () => void;
  focusRequestsTab: () => void;
};

const DriverRideAlertContext = createContext<DriverRideAlertContextValue | undefined>(
  undefined
);

const AUTO_DISMISS_MS = 14_000;

function isRideNotificationType(type: unknown): type is DriverRideAlert["type"] {
  return type === "new_assignment" || type === "live_offer";
}

export function DriverRideAlertProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useDriverAuth();
  const insets = useSafeAreaInsets();
  const [alert, setAlert] = useState<DriverRideAlert | null>(null);
  const slide = useRef(new Animated.Value(-120)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShown = useRef<{ bookingId: string; at: number } | null>(null);

  const clearTimer = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  };

  const dismissRideAlert = useCallback(() => {
    clearTimer();
    Animated.timing(slide, {
      toValue: -140,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setAlert(null));
  }, [slide]);

  const showRideAlert = useCallback(
    (next: DriverRideAlert) => {
      if (!next.bookingId) return;
      // Debounce identical alerts (push + SSE often arrive together)
      const now = Date.now();
      if (
        lastShown.current?.bookingId === next.bookingId &&
        now - lastShown.current.at < 5000
      ) {
        return;
      }
      lastShown.current = { bookingId: next.bookingId, at: now };
      clearTimer();
      setAlert(next);
      if (Platform.OS === "android") {
        Vibration.vibrate([0, 80, 60, 80]);
      } else {
        Vibration.vibrate(80);
      }
      slide.setValue(-140);
      Animated.spring(slide, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }).start();
      dismissTimer.current = setTimeout(() => {
        dismissRideAlert();
      }, AUTO_DISMISS_MS);
    },
    [dismissRideAlert, slide]
  );

  const focusRequestsTab = useCallback(() => {
    router.push({ pathname: "/driver", params: { tab: "requests" } });
  }, []);

  const openFromAlert = useCallback(() => {
    const bookingId = alert?.bookingId;
    dismissRideAlert();
    if (bookingId) {
      router.push({
        pathname: "/driver/ride-details",
        params: { bookingId },
      });
    } else {
      focusRequestsTab();
    }
  }, [alert?.bookingId, dismissRideAlert, focusRequestsTab]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const received = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      if (!isRideNotificationType(data?.type)) return;
      showRideAlert({
        bookingId: String(data.bookingId || ""),
        title: notification.request.content.title || "New Reservation",
        body: notification.request.content.body || "A new reservation is waiting for you.",
        type: data.type,
      });
    });

    const response = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as Record<string, unknown>;
      if (!isRideNotificationType(data?.type)) return;
      const bookingId = String(data.bookingId || "");
      if (bookingId) {
        router.push({
          pathname: "/driver/ride-details",
          params: { bookingId },
        });
      } else {
        focusRequestsTab();
      }
    });

    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (!last) return;
      const data = last.notification.request.content.data as Record<string, unknown>;
      if (!isRideNotificationType(data?.type)) return;
      const bookingId = String(data.bookingId || "");
      if (bookingId) {
        router.push({
          pathname: "/driver/ride-details",
          params: { bookingId },
        });
      }
    });

    return () => {
      received.remove();
      response.remove();
      clearTimer();
    };
  }, [isAuthenticated, showRideAlert, focusRequestsTab]);

  const value = useMemo(
    () => ({ showRideAlert, dismissRideAlert, focusRequestsTab }),
    [showRideAlert, dismissRideAlert, focusRequestsTab]
  );

  return (
    <DriverRideAlertContext.Provider value={value}>
      {children}
      {alert ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.overlay,
            { paddingTop: Math.max(insets.top, 12) + 8, transform: [{ translateY: slide }] },
          ]}
        >
          <View style={styles.card}>
            <View style={styles.cardAccent} />
            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Ionicons name="car-sport" size={18} color="#1a1a1a" />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.eyebrow}>
                    {alert.type === "new_assignment" ? "ASSIGNED TO YOU" : "AVAILABLE NOW"}
                  </Text>
                  <Text style={styles.title} numberOfLines={1}>
                    {alert.title}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={dismissRideAlert}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Dismiss"
                >
                  <Ionicons name="close" size={20} color="rgba(255,255,255,0.55)" />
                </TouchableOpacity>
              </View>
              <Text style={styles.body} numberOfLines={3}>
                {alert.body}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={dismissRideAlert}>
                  <Text style={styles.secondaryBtnText}>Later</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={openFromAlert}>
                  <Text style={styles.primaryBtnText}>View Reservation</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      ) : null}
    </DriverRideAlertContext.Provider>
  );
}

export function useDriverRideAlert() {
  const ctx = useContext(DriverRideAlertContext);
  if (!ctx) {
    throw new Error("useDriverRideAlert must be used within DriverRideAlertProvider");
  }
  return ctx;
}

/** Safe hook when provider may be absent (e.g. outside driver stack). */
export function useDriverRideAlertOptional() {
  return useContext(DriverRideAlertContext);
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 14,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#141414",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(212,160,74,0.35)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardAccent: {
    width: 4,
    backgroundColor: "#D4A04A",
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#D4A04A",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: "#D4A04A",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryBtn: {
    flex: 1.4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#D4A04A",
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#1a1a1a",
    fontSize: 13,
    fontWeight: "800",
  },
});
