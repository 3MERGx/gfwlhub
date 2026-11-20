import { Metadata } from "next";
import { requireStaffPage } from "@/lib/page-auth";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffPage("/dashboard");
  return <>{children}</>;
}
