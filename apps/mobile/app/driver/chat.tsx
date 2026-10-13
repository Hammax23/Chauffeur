import { useLocalSearchParams } from "expo-router";
import TripChatScreen from "../../components/TripChatScreen";

function firstParam(v: string | string[] | undefined): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return "";
}

export default function DriverChatScreen() {
  const { bookingId, name, photo } = useLocalSearchParams<{
    bookingId?: string;
    name?: string;
    photo?: string;
  }>();
  const id = firstParam(bookingId);
  const title = firstParam(name).trim() || "Customer";
  const peerPhoto = firstParam(photo).trim() || undefined;

  return (
    <TripChatScreen
      bookingId={id}
      role="driver"
      title={title}
      peerPhoto={peerPhoto}
    />
  );
}
