import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/ui/toast-context";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GFWL Hub - Games for Windows LIVE Community & Support",
  description:
    "Community hub for Games for Windows LIVE (GFWL) games. Find patches, fixes, and resources for Microsoft's discontinued service.",
  keywords: [
    "Games for Windows LIVE",
    "GFWL",
    "XLLN",
    "Microsoft games",
    "Windows games",
    "Shadowrun",
    "cross-platform gaming",
    "Windows gaming",
    "GFWL fixes",
    "GFWL patches",
  ],
  authors: [{ name: "GFWL Hub Community" }],
  creator: "GFWL Hub",
  publisher: "GFWL Hub",
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
      "Community hub for Games for Windows LIVE (GFWL) games. Find patches, fixes, and resources for Microsoft's discontinued service.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GFWL Hub - Games for Windows LIVE Community & Support",
    description:
      "Community hub for Games for Windows LIVE (GFWL) games. Find patches, fixes, and resources for Microsoft's discontinued service.",
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
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
          <SpeedInsights />
          <Analytics />
        </ToastProvider>
      </body>
    </html>
  );
}
