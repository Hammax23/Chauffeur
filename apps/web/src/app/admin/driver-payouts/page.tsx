import { redirect } from "next/navigation";

/** Legacy route — Driver Pay is now a single simplified screen. */
export default function LegacyDriverPayoutsRedirect() {
  redirect("/admin/driver-pay");
}
