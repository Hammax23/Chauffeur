import { useLocalSearchParams } from "expo-router";
import TripChatScreen from "../../components/TripChatScreen";

export default function CustomerChatScreen() {
  const { bookingId, name } = useLocalSearchParams<{ bookingId?: string; name?: string }>();
  const id = typeof bookingId === "string" ? bookingId : Array.isArray(bookingId) ? bookingId[0] : "";
  const title =
    typeof name === "string" && name.trim()
      ? name
      : Array.isArray(name) && name[0]
        ? name[0]
        : "Driver chat";

  return <TripChatScreen bookingId={id} role="customer" title={title} />;
}
