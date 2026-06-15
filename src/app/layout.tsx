import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transfer Radarı",
  description: "Futbol transfer takip radarı — söylentiden resmi açıklamaya.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
