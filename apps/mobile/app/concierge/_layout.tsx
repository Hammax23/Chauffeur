import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useConciergeAuth } from "../../contexts/ConciergeAuthContext";
import { getConciergeToken } from "../../services/api";
import { SlimSpinner } from "../../components/SlimSpinner";

const GOLD = "#D4A04A";

export default function ConciergeLayout() {
  const { isAuthenticated, isLoading } = useConciergeAuth();
  const [tokenOk, setTokenOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;
    void (async () => {
      const token = await getConciergeToken();
      const ok = !!token && isAuthenticated;
      setTokenOk(ok);
      if (!ok) router.replace("/login");
    })();
  }, [isLoading, isAuthenticated]);

  if (isLoading || tokenOk === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <SlimSpinner size={32} stroke={2} color={GOLD} />
      </View>
    );
  }

  if (!tokenOk) return null;

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="ride/[id]" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
