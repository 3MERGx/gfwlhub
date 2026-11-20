import { Metadata } from "next";
import { requireAdminPage } from "@/lib/page-auth";

export const metadata: Metadata = {
  title: "Audit Log",
};

export default async function AuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage("/dashboard/audit");
  return <>{children}</>;
}
