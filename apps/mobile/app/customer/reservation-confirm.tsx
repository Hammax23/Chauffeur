import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";

/**
 * Confirm screen removed — checkout lives on Review (create-reservation + fromPlanRide).
 * Deep links / stale stack entries bounce home safely.
 */
export default function ReservationConfirmRedirect() {
  useEffect(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/customer/(tabs)");
    }
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
