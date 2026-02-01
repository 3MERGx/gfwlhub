import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ - GFWL Hub",
  description:
    "Frequently asked questions about Games for Windows LIVE issues and fixes.",
  openGraph: {
    title: "FAQ - GFWL Hub",
    description:
      "Frequently asked questions about Games for Windows LIVE issues and fixes.",
    type: "website",
    url: "https://gfwl-hub.vercel.app/faq",
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ - GFWL Hub",
    description:
      "Frequently asked questions about Games for Windows LIVE issues and fixes.",
  },
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

