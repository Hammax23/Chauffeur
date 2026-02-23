import AdminLayout from "@/components/AdminLayout";
import AdminAuth from "@/components/AdminAuth";

export const metadata = {
  title: "Admin Panel | SARJ Worldwide",
  description: "SARJ Worldwide Admin Management Portal",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuth>
      <AdminLayout>{children}</AdminLayout>
    </AdminAuth>
  );
}
