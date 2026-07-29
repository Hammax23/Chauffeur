import "../services/driver-location-task";

import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { DriverAuthProvider } from "../contexts/DriverAuthContext";
import { ConciergeAuthProvider } from "../contexts/ConciergeAuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <DriverAuthProvider>
        <ConciergeAuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="verify-otp" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="driver" />
            <Stack.Screen name="customer" />
            <Stack.Screen name="concierge" />
          </Stack>
        </ConciergeAuthProvider>
      </DriverAuthProvider>
    </AuthProvider>
  );
}
