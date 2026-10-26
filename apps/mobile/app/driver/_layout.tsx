import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  InteractionManager,
  AppState,
  type AppStateStatus,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ensureForegroundLocationPermission, stopDriverLocationTracking } from "../../services/driver-location";
import { syncDriverLiveTracking } from "../../services/driver-live-session";
import { useDriverAuth } from "../../contexts/DriverAuthContext";
import { getDriverToken } from "../../services/api";
import { DriverRideAlertProvider } from "../../contexts/DriverRideAlertContext";
import { DriverThemeProvider } from "../../contexts/DriverThemeContext";
import { SlimSpinner } from "../../components/SlimSpinner";
import { GOLD } from "../../theme/driver-theme";

export default function DriverLayout() {
  const { isAuthenticated, isLoading: authLoading } = useDriverAuth();
  const [tokenOk, setTokenOk] = useState<boolean | null>(null);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    void (async () => {
      const token = await getDriverToken();
      const ok = !!token && isAuthenticated;
      setTokenOk(ok);
      if (!ok) router.replace("/login");
    })();
  }, [authLoading, isAuthenticated]);

  const requestLocation = async () => {
    const res = await ensureForegroundLocationPermission();
    setLocationGranted(res.granted);
  };

  useEffect(() => {
    if (tokenOk) requestLocation();
  }, [tokenOk]);

  /** Permission revoked while logged in — stop native GPS / foreground service. */
  useEffect(() => {
    if (locationGranted === false && tokenOk) {
      stopDriverLocationTracking().catch(() => {});
    }
  }, [locationGranted, tokenOk]);

  /** GPS only while server reports an active trip (ON THE WAY / ARRIVED / CIC). Re-sync on resume. */
  useEffect(() => {
    if (locationGranted !== true || !tokenOk) {
      return;
    }
    let cancelled = false;
    const runSync = () => {
      InteractionManager.runAfterInteractions(() => {
        if (!cancelled) {
          syncDriverLiveTracking().catch(() => {});
        }
      });
    };
    runSync();
    return () => {
      cancelled = true;
    };
  }, [locationGranted, tokenOk]);

  useEffect(() => {
    if (locationGranted !== true || !tokenOk) {
      return;
    }
    const onChange = (state: AppStateStatus) => {
      if (state === "active") {
        syncDriverLiveTracking().catch(() => {});
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [locationGranted, tokenOk]);

  /** Self-heal: OEM battery managers can kill BG GPS mid-trip — re-attach every 30s. */
  useEffect(() => {
    if (locationGranted !== true || !tokenOk) {
      return;
    }
    const id = setInterval(() => {
      syncDriverLiveTracking().catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [locationGranted, tokenOk]);

  if (authLoading || tokenOk === null) {
    return (
      <View style={[styles.blocker, { backgroundColor: "#0b0b0b" }]}>
        <SlimSpinner size={34} stroke={2} color={GOLD} />
      </View>
    );
  }

  if (!tokenOk) return null;

  // Hard requirement: driver must enable location while using the app
  if (locationGranted === false) {
    return (
      <View style={styles.blocker}>
        <View style={styles.blockerIcon}>
          <Ionicons name="location" size={28} color={GOLD} />
        </View>
        <Text style={styles.title}>Location required</Text>
        <Text style={styles.subtitle}>
          Allow location while using the app so you can receive trips and share live tracking.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={requestLocation}>
          <Text style={styles.primaryBtnText}>Enable location</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => Linking.openSettings()}>
          <Text style={styles.secondaryBtnText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <DriverThemeProvider>
      <DriverRideAlertProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="ride-details" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="reviews" />
          <Stack.Screen name="concierge" />
        </Stack>
      </DriverRideAlertProvider>
    </DriverThemeProvider>
  );
}

const styles = StyleSheet.create({
  blocker: {
    flex: 1,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#070707",
  },
  blockerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(212,160,74,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    color: "#F5F5F7",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  subtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 21,
    fontWeight: "500",
    maxWidth: 300,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 240,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtnText: {
    color: "#1A1208",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryBtn: {
    borderColor: "rgba(255,255,255,0.16)",
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 240,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#F5F5F7",
    fontSize: 14,
    fontWeight: "600",
  },
});
