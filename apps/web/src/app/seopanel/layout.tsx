import SeoPanelAuth from "@/components/SeoPanelAuth";

export const metadata = {
  title: "SEO Panel | SARJ Worldwide",
  robots: { index: false, follow: false },
};

export default function SeoPanelRootLayout({ children }: { children: React.ReactNode }) {
  return <SeoPanelAuth>{children}</SeoPanelAuth>;
}
