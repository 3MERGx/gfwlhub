import { Metadata } from "next";
import { requireAdminPage } from "@/lib/page-auth";

export const metadata: Metadata = {
  title: "Manage Games",
};

export default async function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage("/dashboard/games");
  return <>{children}</>;
}
