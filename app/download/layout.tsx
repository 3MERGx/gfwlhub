import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download GFWL Legacy Bypass - Games for Windows LIVE",
  description:
    "Download the GFWL Legacy Bypass for legacy 5x5 GFWL titles. Fixes Games for Windows LIVE activation on Windows 10/11. For compatible titles only.",
  keywords: [
    "GFWL Legacy Bypass",
    "Games for Windows LIVE fix",
    "GFWL activation key",
    "GTA 4 GFWL fix",
    "Fallout 3 GFWL fix",
    "Shadowrun GFWL fix",
    "Windows 10 GFWL fix",
    "Windows 11 GFWL fix",
    "GFWL product key",
    "GFWL download",
    "Microsoft GFWL",
    "GFWL installer",
    "XLLN alternative",
  ],
  openGraph: {
    title: "Download GFWL Legacy Bypass - Games for Windows LIVE",
    description:
      "Free tool for legacy 5x5 GFWL titles. Helps preserve access to compatible games on Windows 10/11.",
    type: "website",
    url: "https://gfwl-hub.vercel.app/download",
  },
  twitter: {
    card: "summary_large_image",
    title: "Download GFWL Legacy Bypass - Games for Windows LIVE",
    description:
      "Free tool for legacy 5x5 GFWL titles. Helps preserve access to compatible games on Windows 10/11.",
  },
  alternates: {
    canonical: "https://gfwl-hub.vercel.app/download",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
