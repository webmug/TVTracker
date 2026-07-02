import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TV Tracker",
  description: "Jouw eigen serie-tracker voor familie & vrienden",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
