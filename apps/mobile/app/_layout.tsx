import "../services/driver-location-task";

import { useEffect } from "react";
import { Linking } from "react-native";
import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { DriverAuthProvider } from "../contexts/DriverAuthContext";
import { ConciergeAuthProvider } from "../contexts/ConciergeAuthContext";
import {
  extractReferralCodeFromUrl,
  setPendingReferralCode,
} from "../utils/pending-referral";

function ReferralDeepLinkListener() {
  useEffect(() => {
    const capture = (url: string | null) => {
      const code = extractReferralCodeFromUrl(url);
      if (code) void setPendingReferralCode(code);
    };
    void Linking.getInitialURL().then(capture);
    const sub = Linking.addEventListener("url", ({ url }) => capture(url));
    return () => sub.remove();
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <DriverAuthProvider>
        <ConciergeAuthProvider>
          <ReferralDeepLinkListener />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="partner" />
            <Stack.Screen name="register" />
            <Stack.Screen name="complete-phone" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="verify-otp" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="driver" />
            <Stack.Screen name="customer" />
            <Stack.Screen name="concierge" />
            <Stack.Screen
              name="legal-doc"
              options={{ animation: "slide_from_right", presentation: "card" }}
            />
          </Stack>
        </ConciergeAuthProvider>
      </DriverAuthProvider>
    </AuthProvider>
  );
}
