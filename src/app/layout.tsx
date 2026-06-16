import type { Metadata } from "next";
import "./globals.css";
import { StudioProvider } from "@/store/StudioContext";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Transfer Radar — İçerik Stüdyosu",
  description:
    "Futbol transfer haberleri YouTube kanalı için içerik üretim platformu.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen antialiased">
        <StudioProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-x-hidden">
              <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
            </main>
          </div>
        </StudioProvider>
      </body>
    </html>
  );
}
