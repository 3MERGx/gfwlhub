"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaArrowLeft, FaCheck, FaTimes, FaEye, FaClock, FaRocket } from "react-icons/fa";
import { GameSubmission } from "@/types/crowdsource";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmPublishModal from "@/components/ConfirmPublishModal";
import { useToast } from "@/components/ui/toast-context";

function GameSubmissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [submissions, setSubmissions] = useState<GameSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [gameFilter, setGameFilter] = useState<string>("");
  const [selectedSubmission, setSelectedSubmission] = useState<GameSubmission | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [publishingSubmission, setPublishingSubmission] = useState<GameSubmission | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchSubmissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, statusFilter, gameFilter]);

  const fetchSubmissions = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (gameFilter) {
        params.append("gameSlug", gameFilter);
      }

      const response = await fetch(`/api/game-submissions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error("Error fetching game submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (submission: GameSubmission) => {
    setSelectedSubmission(submission);
    setShowReviewModal(true);
  };

  const submitReview = async (action: "approved" | "rejected") => {
    if (!selectedSubmission) return;

    setIsReviewing(true);
    try {
      const response = await fetch(`/api/game-submissions/${selectedSubmission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action,
          reviewNotes,
        }),
      });

      if (response.ok) {
        setShowReviewModal(false);
        setReviewNotes("");
        setSelectedSubmission(null);
        await fetchSubmissions();
        // Dispatch event to update notification counts
        window.dispatchEvent(new CustomEvent("gameSubmissionsUpdated"));
      } else {
        alert("Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review");
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass = "px-3 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "pending":
        return <span className={`${baseClass} bg-yellow-900/30 text-yellow-400`}>Pending</span>;
      case "approved":
        return <span className={`${baseClass} bg-green-900/30 text-green-400`}>Approved</span>;
      case "rejected":
        return <span className={`${baseClass} bg-red-900/30 text-red-400`}>Rejected</span>;
      default:
        return <span className={`${baseClass} bg-gray-700 text-gray-300`}>{status}</span>;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isReviewer = session?.user?.role === "reviewer" || session?.user?.role === "admin";
  const isAdmin = session?.user?.role === "admin";

  // Helper function to check if game has minimum required fields
  const hasRequiredFields = (submission: GameSubmission) => {
    const data = submission.proposedData;
    return !!(data.title && data.releaseDate && data.developer && data.publisher);
  };

  // Helper function to get required fields status
  const getRequiredFields = (submission: GameSubmission) => {
    const data = submission.proposedData;
    return {
      title: !!data.title,
      releaseDate: !!data.releaseDate,
      developer: !!data.developer,
      publisher: !!data.publisher,
    };
  };

  const handlePublishGame = (submission: GameSubmission) => {
    setPublishingSubmission(submission);
    setShowConfirmPublish(true);
  };

  const handlePublishConfirm = async () => {
    if (!publishingSubmission) return;

    setShowConfirmPublish(false);
    try {
      const response = await fetch(`/api/games/${publishingSubmission.gameSlug}/publish`, {
        method: "POST",
      });

      if (response.ok) {
        showToast(`${publishingSubmission.gameTitle} has been published successfully!`, 5000, "success");
        await fetchSubmissions();
      } else {
        const error = await response.json();
        showToast(`Failed to publish game: ${error.error || "Unknown error"}`, 5000, "error");
      }
    } catch (error) {
      console.error("Error publishing game:", error);
      showToast("Failed to publish game", 5000, "error");
    } finally {
      setPublishingSubmission(null);
    }
  };

  const handlePublishCancel = () => {
    setShowConfirmPublish(false);
    setPublishingSubmission(null);
  };

  if (loading || status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-white">Loading...</div>
      </div>
    );
  }

  const stats = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    approved: submissions.filter((s) => s.status === "approved").length,
    rejected: submissions.filter((s) => s.status === "rejected").length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#202020] rounded-lg shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Game Submissions</h1>
              <p className="text-gray-400">Complete game information submitted by the community</p>
            </div>
            <Link
              href="/dashboard"
              className="mt-4 md:mt-0 inline-flex items-center text-gray-300 hover:text-white transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back to Dashboard
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#2d2d2d] rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400">Total</div>
            </div>
            <div className="bg-[#2d2d2d] rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-sm text-gray-400">Pending</div>
            </div>
            <div className="bg-[#2d2d2d] rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
              <div className="text-sm text-gray-400">Approved</div>
            </div>
            <div className="bg-[#2d2d2d] rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
              <div className="text-sm text-gray-400">Rejected</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Game</label>
              <input
                type="text"
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                placeholder="Filter by game title..."
                className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
              />
            </div>
          </div>

          {/* Submissions List */}
          {submissions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FaClock size={48} className="mx-auto mb-4 opacity-50" />
              <p>No game submissions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-[#2d2d2d] rounded-lg p-4 md:p-6 border border-gray-700"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{submission.gameTitle}</h3>
                        {getStatusBadge(submission.status)}
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>
                          Submitted by <span className="text-white">{submission.submittedByName}</span>
                        </p>
                        <p>{formatDate(submission.submittedAt)}</p>
                        {submission.reviewedByName && (
                          <p>
                            Reviewed by <span className="text-white">{submission.reviewedByName}</span> on{" "}
                            {formatDate(submission.reviewedAt!)}
                          </p>
                        )}
                        {submission.publishedByName && submission.publishedAt && (
                          <p>
                            Published by <span className="text-white">{submission.publishedByName}</span> on{" "}
                            {formatDate(submission.publishedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 md:mt-0">
                      <button
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setShowReviewModal(true);
                        }}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                      >
                        <FaEye />
                        View Details
                      </button>
                      {isReviewer && submission.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleReview(submission)}
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                          >
                            <FaCheck />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(submission)}
                            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                          >
                            <FaTimes />
                            Reject
                          </button>
                        </>
                      )}
                      {isAdmin && 
                       submission.status === "approved" && 
                       hasRequiredFields(submission) && 
                       !submission.currentGameData?.featureEnabled && (
                        <button
                          onClick={() => handlePublishGame(submission)}
                          className="inline-flex items-center gap-2 bg-[#107c10] hover:bg-[#0e6b0e] text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
                          title="This game has the minimum required fields and can be published"
                        >
                          <FaRocket />
                          Publish Game
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preview of submitted data - only show fields that are different or new */}
                  {(() => {
                    interface SubmissionWithCurrentGame extends GameSubmission {
                      currentGameData?: Record<string, unknown>;
                    }
                    const currentGame = (submission as SubmissionWithCurrentGame).currentGameData;
                    const changedFields = Object.keys(submission.proposedData).filter((key) => {
                      const proposedValue = submission.proposedData[key as keyof typeof submission.proposedData];
                      if (!proposedValue) return false; // Skip empty values
                      
                      // If no current game data, all fields are "new"
                      if (!currentGame) return true;
                      
                      const currentValue = currentGame[key];
                      
                      // Compare arrays
                      if (Array.isArray(proposedValue) && Array.isArray(currentValue)) {
                        return JSON.stringify(proposedValue.sort()) !== JSON.stringify(currentValue.sort());
                      }
                      
                      // Compare strings/other values
                      return proposedValue !== currentValue;
                    });
                    
                    if (changedFields.length === 0) return null;
                    
                    return (
                      <div className="bg-[#1a1a1a] rounded p-4 text-sm">
                        <p className="text-gray-400 mb-2">Submitted Fields:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {changedFields.map((key) => (
                            <span key={key} className="text-green-400 text-xs">
                              ✓ {key.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {submission.submitterNotes && (
                    <div className="mt-3 bg-[#1a1a1a] rounded p-3 text-sm">
                      <p className="text-gray-400 mb-1">Submitter Notes:</p>
                      <p className="text-white">{submission.submitterNotes}</p>
                    </div>
                  )}

                  {submission.reviewNotes && (
                    <div className="mt-3 bg-[#1a1a1a] rounded p-3 text-sm">
                      <p className="text-gray-400 mb-1">Review Notes:</p>
                      <p className="text-white">{submission.reviewNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedSubmission && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
          onClick={() => setShowReviewModal(false)}
        >
          <div
            className="bg-[#1a1a1a] rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-[#2d2d2d] my-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#2d2d2d] p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 z-10">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-white break-words">{selectedSubmission.gameTitle}</h2>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">
                  Submitted by {selectedSubmission.submittedByName}
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-white transition-colors flex-shrink-0 self-start sm:self-auto"
                aria-label="Close modal"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Submitted Data - only show changed fields */}
              {(() => {
                interface SubmissionWithCurrentGame extends GameSubmission {
                  currentGameData?: Record<string, unknown>;
                }
                const currentGame = (selectedSubmission as SubmissionWithCurrentGame).currentGameData;
                const changedFields = Object.entries(selectedSubmission.proposedData).filter(([key, value]) => {
                  if (!value) return false; // Skip empty values
                  
                  // If no current game data, all fields are "new"
                  if (!currentGame) return true;
                  
                  const currentValue = currentGame[key];
                  
                  // Compare arrays
                  if (Array.isArray(value) && Array.isArray(currentValue)) {
                    return JSON.stringify(value.sort()) !== JSON.stringify(currentValue.sort());
                  }
                  
                  // Compare strings/other values
                  return value !== currentValue;
                });
                
                if (changedFields.length === 0) {
                  return (
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                      <p className="text-yellow-300 text-sm">
                        No changes detected. All submitted fields match the current game data.
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
                      Submitted Data ({changedFields.length} field{changedFields.length !== 1 ? "s" : ""} changed)
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      {changedFields.map(([key, value]) => {
                        const isUrl = typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"));
                        const currentValue = currentGame?.[key];
                        return (
                          <div key={key} className="bg-[#2d2d2d] rounded p-3 sm:p-4">
                            <p className="text-xs sm:text-sm text-gray-400 capitalize mb-1 sm:mb-2">
                              {key.replace(/([A-Z])/g, " $1").trim()}:
                            </p>
                            {currentValue !== undefined && currentValue !== null && (
                              <p className="text-gray-500 text-xs mb-1 line-through">
                                Current: {Array.isArray(currentValue) ? currentValue.join(", ") : String(currentValue)}
                              </p>
                            )}
                            {isUrl ? (
                              <a
                                href={value as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 break-all text-xs sm:text-sm underline"
                              >
                                {value as string}
                              </a>
                            ) : (
                              <p className="text-white text-xs sm:text-sm break-words whitespace-pre-wrap">
                                {Array.isArray(value) ? value.join(", ") : value.toString()}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {selectedSubmission.submitterNotes && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Submitter Notes</h3>
                  <div className="bg-[#2d2d2d] rounded p-3 sm:p-4">
                    <p className="text-white text-xs sm:text-sm break-words whitespace-pre-wrap">{selectedSubmission.submitterNotes}</p>
                  </div>
                </div>
              )}

              {isReviewer && selectedSubmission.status === "pending" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Review Notes (Optional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-[#2d2d2d] text-white rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                    placeholder="Add any notes about this review..."
                  />
                </div>
              )}

              {isReviewer && selectedSubmission.status === "pending" && (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  <button
                    onClick={() => submitReview("approved")}
                    disabled={isReviewing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    {isReviewing ? "Approving..." : "Approve Submission"}
                  </button>
                  <button
                    onClick={() => submitReview("rejected")}
                    disabled={isReviewing}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    {isReviewing ? "Rejecting..." : "Reject Submission"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Publish Modal */}
      {showConfirmPublish && publishingSubmission && (
        <ConfirmPublishModal
          gameTitle={publishingSubmission.gameTitle}
          requiredFields={getRequiredFields(publishingSubmission)}
          onConfirm={handlePublishConfirm}
          onCancel={handlePublishCancel}
        />
      )}
    </div>
  );
}

export default function GameSubmissionsPageWrapper() {
  return (
    <DashboardLayout requireRole="reviewer">
      <GameSubmissionsPage />
    </DashboardLayout>
  );
}

