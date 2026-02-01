import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ Submissions - Dashboard",
  description: "Review and manage user-submitted FAQs",
};

export default function FAQSubmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
