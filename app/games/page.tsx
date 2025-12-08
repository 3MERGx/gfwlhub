import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Games - GFWL Hub",
  description:
    "Browse all Games for Windows LIVE titles with support information.",
};

// Redirect to supported games page
export default function GamesPage() {
  redirect("/supported-games");
}
