"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { FaPlus, FaSignInAlt, FaInfoCircle } from "react-icons/fa";
import { Game } from "@/data/games";
import AddGameDetailsModal from "@/components/AddGameDetailsModal";
import Link from "next/link";
import { useToast } from "@/components/ui/toast-context";
import { UserStatus } from "@/types/crowdsource";

interface DisabledGameBannerProps {
  game: Game;
}

export default function DisabledGameBanner({ game }: DisabledGameBannerProps) {
  const { data: session, status } = useSession();
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();

  const handleSubmitSuccess = () => {
    showToast(
      "Game details submitted successfully! They will be reviewed shortly.",
      5000
    );
  };

  const handleButtonClick = () => {
    if (!session || !session.user) {
      return;
    }

    const userStatus = session.user.status as UserStatus;

    if (userStatus === "suspended") {
      interface SessionUserWithSuspension {
        suspendedUntil?: string | Date;
      }
      const suspendedUntil = (session.user as SessionUserWithSuspension).suspendedUntil;
      let message =
        "Your account is suspended. You cannot submit game details.";

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
        "Your account is permanently restricted from submitting content. Please contact support if you believe this is an error.",
        5000
      );
      return;
    }

    if (userStatus === "blocked") {
      showToast(
        "Your account is blocked. You cannot submit content. Please contact support.",
        5000
      );
      return;
    }

    setShowModal(true);
  };

  return (
    <>
      <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            <FaInfoCircle className="text-yellow-400" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">
              Limited Information Available
            </h3>
            <p className="text-yellow-200 text-sm mb-4">
              We don&apos;t have complete information for this game yet. Help us by
              contributing what you know! Your submission will be reviewed before
              being published.
            </p>

            {status === "loading" && (
              <div className="flex items-center gap-2 text-yellow-300">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-300"></div>
                <span className="text-sm">Loading...</span>
              </div>
            )}

            {!session && status !== "loading" && (
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-[#107c10] focus:ring-opacity-75"
              >
                <FaSignInAlt />
                Sign In to Add Game Details
              </Link>
            )}

            {session && status === "authenticated" && (
              <button
                onClick={handleButtonClick}
                className="inline-flex items-center gap-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-[#107c10] focus:ring-opacity-75"
              >
                <FaPlus />
                Add Game Details
              </button>
            )}
          </div>
        </div>
      </div>

      {showModal && session && (
        <AddGameDetailsModal
          game={game}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitSuccess}
          userId={session.user.id || ""}
          userName={session.user.name || "Anonymous"}
        />
      )}
    </>
  );
}

