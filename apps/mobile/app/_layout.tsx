import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { DriverAuthProvider } from "../contexts/DriverAuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <DriverAuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="verify-otp" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="driver" />
          <Stack.Screen name="customer" />
        </Stack>
      </DriverAuthProvider>
    </AuthProvider>
  );
}
