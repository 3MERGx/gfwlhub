import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download - GFWL Hub",
  description:
    "Download the latest version of the Games for Windows LIVE fix and installation tools.",
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
