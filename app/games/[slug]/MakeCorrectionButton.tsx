"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { FaEdit, FaSignInAlt } from "react-icons/fa";
import { Game } from "@/data/games";
import CorrectionModal from "@/components/CorrectionModal";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-context";
import type { CorrectionField } from "@/types/crowdsource";

interface MakeCorrectionButtonProps {
  game: Game;
  initialField?: CorrectionField;
  /** Compact text link for section headers */
  variant?: "button" | "link";
  label?: string;
}

export default function MakeCorrectionButton({
  game,
  initialField,
  variant = "button",
  label,
}: MakeCorrectionButtonProps) {
  const { data: session, status } = useSession();
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();

  const buttonLabel = label || "Suggest a correction";

  const handleSubmitSuccess = () => {
    showToast(
      "Correction submitted! A reviewer will check it before the page updates.",
      5000,
      "success"
    );
  };

  const handleButtonClick = () => {
    if (!session) return;

    const userStatus = session.user.status as
      | "active"
      | "suspended"
      | "restricted"
      | "blocked"
      | "deleted";

    if (userStatus === "suspended") {
      interface SessionUserWithSuspension {
        suspendedUntil?: string | Date;
      }
      const suspendedUntil = (session.user as SessionUserWithSuspension)
        .suspendedUntil;
      let message = "Your account is suspended. You cannot submit corrections.";

      if (suspendedUntil) {
        const endDate = new Date(suspendedUntil);
        const now = new Date();
        if (endDate > now) {
          const daysLeft = Math.ceil(
            (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          message = `Your account is suspended until ${endDate.toLocaleDateString()} (${daysLeft} day${
            daysLeft !== 1 ? "s" : ""
          } remaining). Please contact support if you have questions.`;
        }
      }

      showToast(message, 5000);
      return;
    }

    if (userStatus === "restricted") {
      showToast(
        "Your account is permanently restricted from submitting corrections. Please contact support if you believe this is an error.",
        5000
      );
      return;
    }

    if (userStatus === "blocked") {
      showToast(
        "Your account is blocked. You cannot submit corrections. Please contact support.",
        5000
      );
      return;
    }

    setShowModal(true);
  };

  const modal = showModal && session && (
    <CorrectionModal
      game={game}
      onClose={() => setShowModal(false)}
      onSubmit={handleSubmitSuccess}
      userEmail={session.user.email || ""}
      userName={session.user.name || "Anonymous"}
      userId={session.user.id}
      initialField={initialField}
    />
  );

  if (status === "loading") {
    if (variant === "link") {
      return (
        <span className="text-xs text-[rgb(var(--text-muted))]">Loading...</span>
      );
    }
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!session) {
    const handleSignInClick = () => {
      if (typeof window !== "undefined" && pathname) {
        try {
          localStorage.setItem("gfwl_callback_url", pathname);
        } catch {
          // localStorage might be unavailable
        }
      }

      const callbackUrl = encodeURIComponent(pathname);
      router.push(`/auth/signin?callbackUrl=${callbackUrl}`);
    };

    if (variant === "link") {
      return (
        <>
          <button
            type="button"
            onClick={handleSignInClick}
            className="text-xs text-[#107c10] hover:underline"
          >
            Sign in to suggest a change
          </button>
        </>
      );
    }

    return (
      <button
        onClick={handleSignInClick}
        className="inline-flex items-center gap-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-[#107c10] focus:ring-opacity-75"
      >
        <FaSignInAlt />
        Sign in to suggest a correction
      </button>
    );
  }

  if (variant === "link") {
    return (
      <>
        <button
          type="button"
          onClick={handleButtonClick}
          className="text-xs text-[#107c10] hover:underline"
        >
          {label || "Suggest a change"}
        </button>
        {modal}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleButtonClick}
        className="inline-flex items-center gap-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-[#107c10] focus:ring-opacity-75"
      >
        <FaEdit />
        {buttonLabel}
      </button>
      {modal}
    </>
  );
}
