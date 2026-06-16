import type { Metadata } from "next";
import "./globals.css";
import { StudioProvider } from "@/store/StudioContext";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Transfer Radar — YouTube İçerik Platformu",
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
      <body>
        <StudioProvider>
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">
              <div className="page-container">{children}</div>
            </main>
          </div>
        </StudioProvider>
      </body>
    </html>
  );
}
