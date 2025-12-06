"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { FaExclamationTriangle, FaTimes, FaRocket, FaCheckCircle, FaCheck, FaTimes as FaTimesIcon } from "react-icons/fa";
import Link from "next/link";
import ConfirmPublishModal from "@/components/ConfirmPublishModal";
import { useToast } from "@/components/ui/toast-context";
import { safeLog } from "@/lib/security";

interface DisabledGamePromptProps {
  gameTitle: string;
  gameSlug: string;
  onClose?: () => void; // Optional callback for custom close behavior
  onAddDetails?: () => void; // Optional callback to open AddGameDetailsModal
}

interface GameStatus {
  hasRequiredFields: boolean;
  requiredFields: {
    title: boolean;
    releaseDate: boolean;
    developer: boolean;
    publisher: boolean;
  };
  readyToPublish: boolean;
  featureEnabled: boolean;
}

export default function DisabledGamePrompt({
  gameTitle,
  gameSlug,
  onClose,
  onAddDetails,
}: DisabledGamePromptProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(true);
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<{
    hasPendingSubmission: boolean;
    submittedByName?: string;
    submittedAt?: Date;
    proposedData?: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    // Fetch game status
    const fetchGameStatus = async () => {
      try {
        const response = await fetch(`/api/games/${gameSlug}/status`);
        if (response.ok) {
          const data = await response.json();
          setGameStatus(data);
        }
      } catch (error) {
        safeLog.error("Error fetching game status:", error);
      }
    };

    // Fetch pending submission status
    const fetchPendingSubmission = async () => {
      try {
        const response = await fetch(`/api/games/${gameSlug}/pending-submission`);
        if (response.ok) {
          const data = await response.json();
          setPendingSubmission(data);
        }
      } catch (error) {
        safeLog.error("Error fetching pending submission:", error);
      }
    };

    fetchGameStatus();
    fetchPendingSubmission();
  }, [gameSlug]);

  const handleClose = () => {
    setShowModal(false);
    if (onClose) {
      onClose();
    } else {
      // Default behavior: redirect to supported games
      router.push("/supported-games");
    }
  };

  const handlePublishClick = () => {
    setShowConfirmPublish(true);
  };

  const handlePublishConfirm = async () => {
    setShowConfirmPublish(false);
    setIsPublishing(true);
    try {
      const response = await fetch(`/api/games/${gameSlug}/publish`, {
        method: "POST",
      });

      if (response.ok) {
        showToast(`${gameTitle} has been published successfully!`, 5000, "success");
        
        // Refresh UI
        if (pathname?.startsWith("/games/")) {
          router.refresh();
        }
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const error = await response.json();
        showToast(`Failed to publish game: ${error.error || "Unknown error"}`, 5000, "error");
      }
    } catch (error) {
      safeLog.error("Error publishing game:", error);
      showToast("Failed to publish game", 5000, "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishCancel = () => {
    setShowConfirmPublish(false);
  };

  if (!showModal) return null;

  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[rgb(var(--bg-card))] rounded-lg max-w-md w-full border border-[rgb(var(--border-color))] animate-fade-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-900/30 flex items-center justify-center">
              <FaExclamationTriangle className="text-yellow-400" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[rgb(var(--text-primary))] mb-1">
                Game Not Available
              </h2>
              <p className="text-[rgb(var(--text-secondary))] text-sm">{gameTitle}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4 mb-6">
            <p className="text-[rgb(var(--text-primary))] text-sm leading-relaxed">
              This game is currently hidden from public view because we don&apos;t
              have complete information yet.
            </p>

            {/* Game Status Information */}
            {gameStatus && (
              <div className={`${gameStatus.hasRequiredFields ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-500/30'} border rounded-lg p-4`}>
                <div className="flex items-start gap-2 mb-3">
                  {gameStatus.hasRequiredFields ? (
                    <FaCheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={16} />
                  ) : (
                    <FaExclamationTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
                  )}
                  <div>
                    <p className={`${gameStatus.hasRequiredFields ? 'text-green-800 dark:text-green-300' : 'text-yellow-800 dark:text-yellow-300'} text-xs`}>
                      {gameStatus.hasRequiredFields 
                        ? 'All required fields have been met. This game is waiting for an admin to publish it.'
                        : 'This game needs the following fields to be published:'}
                    </p>
                  </div>
                </div>

                {/* Required Fields Checklist */}
                <div className="space-y-2 mt-3 pl-6">
                  <div className="flex items-center gap-2">
                    {gameStatus.requiredFields.title ? (
                      <FaCheck className="text-green-400 flex-shrink-0" size={12} />
                    ) : (
                      <FaTimesIcon className="text-red-400 flex-shrink-0" size={12} />
                    )}
                    <span className={`text-xs ${gameStatus.requiredFields.title ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))]'}`}>
                      Title
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {gameStatus.requiredFields.releaseDate ? (
                      <FaCheck className="text-green-400 flex-shrink-0" size={12} />
                    ) : (
                      <FaTimesIcon className="text-red-400 flex-shrink-0" size={12} />
                    )}
                    <span className={`text-xs ${gameStatus.requiredFields.releaseDate ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))]'}`}>
                      Release Date
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {gameStatus.requiredFields.developer ? (
                      <FaCheck className="text-green-400 flex-shrink-0" size={12} />
                    ) : (
                      <FaTimesIcon className="text-red-400 flex-shrink-0" size={12} />
                    )}
                    <span className={`text-xs ${gameStatus.requiredFields.developer ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))]'}`}>
                      Developer
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {gameStatus.requiredFields.publisher ? (
                      <FaCheck className="text-green-400 flex-shrink-0" size={12} />
                    ) : (
                      <FaTimesIcon className="text-red-400 flex-shrink-0" size={12} />
                    )}
                    <span className={`text-xs ${gameStatus.requiredFields.publisher ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))]'}`}>
                      Publisher
                    </span>
                  </div>
                </div>
              </div>
            )}

            {status === "loading" && (
              <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))]">
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
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-lg p-4">
                {pendingSubmission?.hasPendingSubmission ? (
                  <>
                    <p className="text-yellow-800 dark:text-yellow-300 text-sm mb-2">
                      <strong>Submission Already Pending</strong>
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300/80 text-xs mb-3">
                      A submission for this game has already been submitted and is awaiting review.
                    </p>
                    <button
                      disabled
                      className="inline-flex items-center gap-2 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 font-semibold py-2 px-4 rounded-lg cursor-not-allowed text-sm"
                    >
                      Submission Already Pending
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-green-800 dark:text-green-300 text-sm mb-3">
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
                  </>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {isAdmin && gameStatus?.hasRequiredFields && (
              <button
                onClick={handlePublishClick}
                disabled={isPublishing}
                className="w-full bg-[#107c10] hover:bg-[#0e6b0e] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPublishing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <FaRocket />
                    Publish Game Now
                  </>
                )}
              </button>
            )}
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
                } bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm border border-[rgb(var(--border-color))]`}
              >
                Back to Games
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Publish Modal */}
      {showConfirmPublish && gameStatus && (
        <ConfirmPublishModal
          gameTitle={gameTitle}
          requiredFields={gameStatus.requiredFields}
          onConfirm={handlePublishConfirm}
          onCancel={handlePublishCancel}
        />
      )}
    </div>
  );
}

