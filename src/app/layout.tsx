import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppInitializer } from "@/components/AppInitializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NORTHLINK AI",
  description: "AI-Powered Resilient Logistics & Accessibility Intelligence for Northeast India",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased bg-slate-950 text-slate-200 h-screen flex overflow-hidden`}
      >
        <AppInitializer />
        {children}
      </body>
    </html>
  );
}
