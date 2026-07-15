import { Stack } from "expo-router";

/**
 * Stack wraps the main tabs so booking screens (create → confirm → pending)
 * push on top. Back from confirm returns to create-reservation with form state.
 */
export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-reservation" />
      <Stack.Screen name="reservation-confirm" />
      <Stack.Screen name="reservation-pending" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="track-ride" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
