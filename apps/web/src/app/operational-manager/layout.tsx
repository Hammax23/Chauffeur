import OperationalManagerAuth from "@/components/OperationalManagerAuth";

export const metadata = {
  title: "Operational Manager | SARJ Worldwide",
  description: "Assign drivers to reservations",
};

export default function OperationalManagerLayout({ children }: { children: React.ReactNode }) {
  return <OperationalManagerAuth>{children}</OperationalManagerAuth>;
}
