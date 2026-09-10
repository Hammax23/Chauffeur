"use client";

import CustomReservationForm from "@/components/CustomReservationForm";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";

export default function OperationalManagerCustomReservationPage() {
  return (
    <GoogleMapsProvider>
      <CustomReservationForm />
    </GoogleMapsProvider>
  );
}
