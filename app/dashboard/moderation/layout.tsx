import { Metadata } from "next";
import { requireAdminPage } from "@/lib/page-auth";

export const metadata: Metadata = {
  title: "Moderation Log",
};

export default async function ModerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage("/dashboard/moderation");
  return <>{children}</>;
}
