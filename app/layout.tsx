import "./globals.css";
import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast-context";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "@/components/Providers";
import SessionExpirationWarning from "@/components/SessionExpirationWarning";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "GFWL Hub - Games for Windows LIVE Community",
    template: "%s | GFWL Hub",
  },
  description:
    "Community-driven resource for Games for Windows LIVE (GFWL) games. Find fixes, patches, and support for GFWL titles on Windows 10/11. Get your classic games working again.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://gfwl-hub.vercel.app"
  ),
  keywords: [
    "Games for Windows LIVE",
    "GFWL",
    "Xbox on Windows",
    "Microsoft Gaming",
    "PC Gaming",
  ],
  authors: [{ name: "GFWL Hub Community" }],
  creator: "GFWL Hub Community",
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://gfwl-hub.vercel.app/",
    siteName: "GFWL Hub",
    title: "GFWL Hub - Games for Windows LIVE Community & Support",
    description:
      "Community-driven resource for Games for Windows LIVE (GFWL) games. Find fixes, patches, and support for GFWL titles on Windows 10/11. Get your classic games working again.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GFWL Hub - Games for Windows LIVE Community & Support",
    description:
      "Community-driven resource for Games for Windows LIVE (GFWL) games. Find fixes, patches, and support for GFWL titles on Windows 10/11. Get your classic games working again.",
    images: ["https://gfwl-hub.vercel.app/twitter-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://gfwl-hub.vercel.app",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body
        className={`h-full min-h-screen flex flex-col bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] ${inter.className}`}
      >
        <Providers>
          <ToastProvider>
            <SessionExpirationWarning />
            <Header />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
            <SpeedInsights />
            <Analytics />
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
