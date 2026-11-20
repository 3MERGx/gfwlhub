import { Metadata } from "next";
import { requireAdminPage } from "@/lib/page-auth";

export const metadata: Metadata = {
  title: "Manage Users",
};

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage("/dashboard/users");
  return <>{children}</>;
}
