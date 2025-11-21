"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";
import Link from "next/link";

interface DisabledGamePromptProps {
  gameTitle: string;
  gameSlug: string;
  onClose?: () => void; // Optional callback for custom close behavior
  onAddDetails?: () => void; // Optional callback to open AddGameDetailsModal
}

export default function DisabledGamePrompt({
  gameTitle,
  gameSlug,
  onClose,
  onAddDetails,
}: DisabledGamePromptProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showModal, setShowModal] = useState(true);

  const handleClose = () => {
    setShowModal(false);
    if (onClose) {
      onClose();
    } else {
      // Default behavior: redirect to supported games
      router.push("/supported-games");
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-lg max-w-md w-full border border-[#2d2d2d] animate-fade-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-900/30 flex items-center justify-center">
              <FaExclamationTriangle className="text-yellow-400" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                Game Not Available
              </h2>
              <p className="text-gray-400 text-sm">{gameTitle}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4 mb-6">
            <p className="text-gray-300 text-sm leading-relaxed">
              This game is currently hidden from public view because we don&apos;t
              have complete information yet.
            </p>

            {status === "loading" && (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span className="text-sm">Loading...</span>
              </div>
            )}

            {!session && status !== "loading" && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  <strong>Want to help?</strong> Sign in and contribute the
                  missing information to help make this game available for
                  everyone!
                </p>
              </div>
            )}

            {session && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-300 text-sm mb-3">
                  <strong>Help us out!</strong> You can add the missing game
                  details to help enable this game for the community.
                </p>
                {onAddDetails ? (
                  <button
                    onClick={() => {
                      setShowModal(false);
                      onAddDetails();
                    }}
                    className="inline-flex items-center gap-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Add Game Details
                  </button>
                ) : (
                  <Link
                    href={`/games/${gameSlug}`}
                    className="inline-flex items-center gap-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowModal(false);
                    }}
                  >
                    Add Game Details
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!session && status !== "loading" && (
              <Link
                href="/auth/signin"
                className="flex-1 bg-[#107c10] hover:bg-[#0d6b0d] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-center text-sm"
              >
                Sign In to Help
              </Link>
            )}
            <button
              onClick={handleClose}
              className={`${
                session || status === "loading" ? "flex-1" : "flex-1"
              } bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm`}
            >
              Back to Games
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

