import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review Submissions",
};

export default function SubmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

