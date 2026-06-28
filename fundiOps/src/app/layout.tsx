import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "fundiOps — WhatsApp CRM",
  description: "AI-powered WhatsApp Business CRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-fundiops-bg antialiased">{children}</body>
    </html>
  );
}
