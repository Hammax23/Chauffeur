import { CommonActions } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";

/** Tab routes under customer/(tabs). */
const TAB_ROUTES = [
  { name: "index" },
  { name: "reservations" },
  { name: "history" },
  { name: "profile" },
] as const;

/**
 * After a successful booking, wipe create/confirm from the stack so Back
 * never returns to a filled Create Reservation form.
 */
export function resetToBookingsTab(navigation: NavigationProp<ParamListBase>) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: "(tabs)",
          state: {
            index: 1,
            routes: [...TAB_ROUTES],
          },
        },
      ],
    })
  );
}

export function resetToTripDetail(
  navigation: NavigationProp<ParamListBase>,
  bookingId: string
) {
  navigation.dispatch(
    CommonActions.reset({
      index: 1,
      routes: [
        {
          name: "(tabs)",
          state: {
            index: 1,
            routes: [...TAB_ROUTES],
          },
        },
        { name: "trip-detail", params: { bookingId } },
      ],
    })
  );
}

/** Land on confirmed screen with booking flow screens removed from the stack. */
export function resetToReservationConfirmed(
  navigation: NavigationProp<ParamListBase>,
  bookingId: string
) {
  navigation.dispatch(
    CommonActions.reset({
      index: 1,
      routes: [
        {
          name: "(tabs)",
          state: {
            index: 1,
            routes: [...TAB_ROUTES],
          },
        },
        { name: "reservation-pending", params: { bookingId } },
      ],
    })
  );
}
