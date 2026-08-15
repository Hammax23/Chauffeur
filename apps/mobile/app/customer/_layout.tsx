import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { StripeProvider } from "@stripe/stripe-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { CustomerThemeProvider } from "../../contexts/CustomerThemeContext";
import { getCustomerToken } from "../../services/api";
import { SlimSpinner } from "../../components/SlimSpinner";
import { GOLD } from "../../theme/driver-theme";
import { customerNeedsPhone } from "../../utils/customer-phone";

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

/**
 * Stack wraps the main tabs so booking screens (create → confirm → pending)
 * push on top. Back from confirm returns to create-reservation with form state.
 */
export default function CustomerLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [tokenOk, setTokenOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;
    void (async () => {
      const token = await getCustomerToken();
      const ok = !!token && isAuthenticated;
      setTokenOk(ok);
      if (!ok) {
        router.replace("/login");
        return;
      }
      if (customerNeedsPhone(user?.phone)) {
        router.replace("/complete-phone");
      }
    })();
  }, [isLoading, isAuthenticated, user?.phone]);

  if (isLoading || tokenOk === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#070707" }}>
        <SlimSpinner size={32} stroke={2} color={GOLD} />
      </View>
    );
  }

  if (!tokenOk) return null;
  if (customerNeedsPhone(user?.phone)) return null;

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      urlScheme="sarjworldwide"
    >
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
    </StripeProvider>
  );
}
