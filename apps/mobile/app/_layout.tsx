import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "@/context/AuthContext";
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#1a1a1a",
          },
          headerTintColor: "#C9A063",
          headerTitleStyle: {
            fontWeight: "600",
          },
          contentStyle: {
            backgroundColor: "#ffffff",
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="booking/[serviceId]"
          options={{
            title: "Book Service",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="auth/login"
          options={{
            title: "Login",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="auth/register"
          options={{
            title: "Create Account",
            presentation: "modal",
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
