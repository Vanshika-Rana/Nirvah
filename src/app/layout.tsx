import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Outfit } from "next/font/google";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Nirvah",
  title: {
    default: "Nirvah",
    template: "%s · Nirvah",
  },
  description: "A private personal budget tracker for weekly spending and monthly salary.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nirvah",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0F766E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
        <Toaster position="top-center" richColors />
        <PwaRegister />
      </body>
    </html>
  );
}
