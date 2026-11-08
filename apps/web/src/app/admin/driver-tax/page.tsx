import { redirect } from "next/navigation";

/** Legacy route — T4A removed from daily admin UI (API still available). */
export default function LegacyDriverTaxRedirect() {
  redirect("/admin/driver-pay");
}
