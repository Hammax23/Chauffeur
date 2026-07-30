import { Stack } from "expo-router";

/** Enterprise Hotel Partner (Concierge) entry — separate from consumer app login. */
export default function PartnerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
