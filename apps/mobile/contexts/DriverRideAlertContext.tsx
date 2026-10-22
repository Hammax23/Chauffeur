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
import { isDriverConciergeEnrolled } from "../services/api";
import {
  parseNotificationData,
  openDriverBookingFromNotification,
  routeDriverLastNotificationResponse,
  routeDriverNotificationResponse,
  setNotificationBookingOpenedListener,
} from "../services/notification-deep-link";

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
    const type = alert?.type;
    dismissRideAlert();
    if (bookingId) {
      void openDriverBookingFromNotification(bookingId, { type });
    } else {
      focusRequestsTab();
    }
  }, [alert?.bookingId, alert?.type, dismissRideAlert, focusRequestsTab]);

  useEffect(() => {
    if (!isAuthenticated) return;

    setNotificationBookingOpenedListener(() => {
      // Clear in-app banner so it doesn't sit on top of opened ride details
      dismissRideAlert();
    });

    const received = Notifications.addNotificationReceivedListener((notification) => {
      const data = parseNotificationData(notification.request.content.data);
      if (data?.type === "concierge_offer") {
        // Only enrolled Concierge drivers should react to hotel offers.
        void isDriverConciergeEnrolled().then((enrolled) => {
          if (!enrolled) return;
          if (Platform.OS === "android") Vibration.vibrate([0, 60, 40, 60]);
          else Vibration.vibrate(60);
        });
        return;
      }
      if (!isRideNotificationType(data?.type)) return;
      const bookingId = String(data.bookingId || "");
      if (!bookingId) return;
      showRideAlert({
        bookingId,
        title: notification.request.content.title || "New Reservation",
        body: notification.request.content.body || "A new reservation is waiting for you.",
        type: data.type,
      });
    });

    const response = Notifications.addNotificationResponseReceivedListener((res) => {
      void routeDriverNotificationResponse(res);
    });

    void routeDriverLastNotificationResponse();

    return () => {
      setNotificationBookingOpenedListener(null);
      received.remove();
      response.remove();
      clearTimer();
    };
  }, [isAuthenticated, showRideAlert, dismissRideAlert]);

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
            { paddingTop: Math.max(insets.top, 10) + 6, transform: [{ translateY: slide }] },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={openFromAlert}
            style={styles.strip}
            accessibilityRole="button"
            accessibilityLabel="View offer"
          >
            <View style={styles.stripIcon}>
              <Ionicons name="car-sport" size={18} color="#1A1208" />
            </View>
            <View style={styles.stripCopy}>
              <Text style={styles.stripEyebrow}>
                {alert.type === "new_assignment" ? "Assigned to you" : "New offer"}
              </Text>
              <Text style={styles.stripTitle} numberOfLines={1}>
                {alert.title}
              </Text>
              <Text style={styles.stripBody} numberOfLines={1}>
                {alert.body}
              </Text>
            </View>
            <View style={styles.viewPill}>
              <Text style={styles.viewPillText}>View</Text>
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                dismissRideAlert();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Dismiss"
              style={styles.dismissBtn}
            >
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          </TouchableOpacity>
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
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#121212",
    borderRadius: 16,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212,160,74,0.4)",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  stripIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#D4A04A",
    alignItems: "center",
    justifyContent: "center",
  },
  stripCopy: { flex: 1, minWidth: 0 },
  stripEyebrow: {
    color: "#D4A04A",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  stripTitle: {
    color: "#F5F5F7",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  stripBody: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  viewPill: {
    backgroundColor: "#D4A04A",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewPillText: {
    color: "#1A1208",
    fontSize: 13,
    fontWeight: "800",
  },
  dismissBtn: {
    padding: 4,
  },
});
