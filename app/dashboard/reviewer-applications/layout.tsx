import { Metadata } from "next";
import { requireAdminPage } from "@/lib/page-auth";

export const metadata: Metadata = {
  title: "Reviewer Applications",
};

export default async function ReviewerApplicationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage("/dashboard/reviewer-applications");
  return <>{children}</>;
}
