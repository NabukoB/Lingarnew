import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "Lingar — The digest that remembers you",
  description:
    "A personal intelligence OS disguised as a newsletter digest. Forward your newsletters. Get back clarity.",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-lingar-dark text-lingar-paper font-sans antialiased min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 pt-6 pb-24">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
