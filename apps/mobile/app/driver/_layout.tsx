import { Stack } from "expo-router";
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
import { ensureForegroundLocationPermission, stopDriverLocationTracking } from "../../services/driver-location";
import { syncDriverLiveTracking } from "../../services/driver-live-session";
import { useDriverAuth } from "../../contexts/DriverAuthContext";

export default function DriverLayout() {
  const { isAuthenticated } = useDriverAuth();
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

  const requestLocation = async () => {
    const res = await ensureForegroundLocationPermission();
    setLocationGranted(res.granted);
  };

  useEffect(() => {
    requestLocation();
  }, []);

  /** Permission revoked while logged in — stop native GPS / foreground service. */
  useEffect(() => {
    if (locationGranted === false && isAuthenticated) {
      stopDriverLocationTracking().catch(() => {});
    }
  }, [locationGranted, isAuthenticated]);

  /** GPS only while server reports an active trip (ON THE WAY / ARRIVED / CIC). Re-sync on resume. */
  useEffect(() => {
    if (locationGranted !== true || !isAuthenticated) {
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
  }, [locationGranted, isAuthenticated]);

  useEffect(() => {
    if (locationGranted !== true || !isAuthenticated) {
      return;
    }
    const onChange = (state: AppStateStatus) => {
      if (state === "active") {
        syncDriverLiveTracking().catch(() => {});
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [locationGranted, isAuthenticated]);

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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="ride-details" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="profile" />
    </Stack>
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
