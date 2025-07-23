import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download GFWL Keygen - Fix for Games for Windows LIVE Activations",
  description:
    "Download the community-made GFWL Keygen to fix Games for Windows LIVE activation issues on Windows 10/11. Free tool for GTA 4, Fallout 3, Shadowrun, and other GFWL games.",
  keywords: [
    "GFWL Keygen",
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
    title: "Download GFWL Keygen - Fix for Games for Windows LIVE Activations",
    description:
      "Free tool to help perserve access to GFWL titles like GTA 4, Fallout 3, and Shadowrun as well as other GFWL titles.",
    type: "website",
    url: "https://gfwl-hub.vercel.app/download",
  },
  twitter: {
    card: "summary_large_image",
    title: "Download GFWL Keygen - Fix for Games for Windows LIVE Activations",
    description:
      "Free tool to help perserve access to GFWL titles like GTA 4, Fallout 3, and Shadowrun as well as other GFWL titles.",
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
