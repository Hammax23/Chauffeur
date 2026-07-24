import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { CustomerThemeProvider } from "../../contexts/CustomerThemeContext";
import { getCustomerToken } from "../../services/api";
import { SlimSpinner } from "../../components/SlimSpinner";
import { GOLD } from "../../theme/driver-theme";

/**
 * Stack wraps the main tabs so booking screens (create → confirm → pending)
 * push on top. Back from confirm returns to create-reservation with form state.
 */
export default function CustomerLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [tokenOk, setTokenOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;
    void (async () => {
      const token = await getCustomerToken();
      const ok = !!token && isAuthenticated;
      setTokenOk(ok);
      if (!ok) router.replace("/login");
    })();
  }, [isLoading, isAuthenticated]);

  if (isLoading || tokenOk === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#070707" }}>
        <SlimSpinner size={32} stroke={2} color={GOLD} />
      </View>
    );
  }

  if (!tokenOk) return null;

  return (
    <CustomerThemeProvider>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create-reservation" />
        <Stack.Screen name="reservation-confirm" />
        <Stack.Screen name="reservation-pending" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="track-ride" />
        <Stack.Screen name="chat" />
      </Stack>
    </CustomerThemeProvider>
  );
}
