import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Product Discovery — Home Goods",
  description: "Search and browse ~4,000 home-goods products.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[--bg] antialiased">{children}</body>
    </html>
  );
}
