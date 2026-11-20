import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review corrections",
};

export default function SubmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

