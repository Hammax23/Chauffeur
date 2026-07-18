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
  ActivityIndicator,
  type AppStateStatus,
} from "react-native";
import { ensureForegroundLocationPermission, stopDriverLocationTracking } from "../../services/driver-location";
import { syncDriverLiveTracking } from "../../services/driver-live-session";
import { useDriverAuth } from "../../contexts/DriverAuthContext";
import { getDriverToken } from "../../services/api";
import { DriverRideAlertProvider } from "../../contexts/DriverRideAlertContext";

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

  if (authLoading || tokenOk === null) {
    return (
      <View style={[styles.blocker, { backgroundColor: "#0b0b0b" }]}>
        <ActivityIndicator size="large" color="#D4A04A" />
      </View>
    );
  }

  if (!tokenOk) return null;

  // Hard requirement: driver must enable location while using the app
  if (locationGranted === false) {
    return (
      <View style={styles.blocker}>
        <Text style={styles.title}>Location Required</Text>
        <Text style={styles.subtitle}>
          Driver app use karne ke liye location ON (Allow while using the app) zaroori hai.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={requestLocation}>
          <Text style={styles.primaryBtnText}>Enable Location</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => Linking.openSettings()}>
          <Text style={styles.secondaryBtnText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <DriverRideAlertProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="ride-details" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="profile" />
      </Stack>
    </DriverRideAlertProvider>
  );
}

const styles = StyleSheet.create({
  blocker: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b0b0b",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: "#D4A04A",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 220,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtnText: {
    color: "#111",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryBtn: {
    borderColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 220,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
