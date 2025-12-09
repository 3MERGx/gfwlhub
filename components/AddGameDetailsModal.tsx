"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FaTimes, FaPlus, FaTrash } from "react-icons/fa";
import { Game } from "@/data/games";
import UrlSafetyIndicator from "@/components/UrlSafetyIndicator";
import { getUrlValidationError } from "@/lib/url-validation";
import { safeLog } from "@/lib/security";
import { useToast } from "@/components/ui/toast-context";
import { useCSRF } from "@/hooks/useCSRF";
import { isNsfwDomainBlocked, isDirectDownloadLink } from "@/lib/nsfw-blacklist";

interface AddGameDetailsModalProps {
  game: Game;
  onClose: () => void;
  onSubmit: () => void;
  userId: string;
  userName: string;
}

export default function AddGameDetailsModal({
  game,
  onClose,
  onSubmit,
  userId,
  userName,
}: AddGameDetailsModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const { csrfToken } = useCSRF();
  const [formData, setFormData] = useState({
    title: game.title || "",
    description: game.description || "",
    releaseDate: game.releaseDate || "",
    developer: game.developer || "",
    publisher: game.publisher || "",
    genres: game.genres || [],
    platforms: game.platforms || [],
    activationType: game.activationType || "Legacy (5x5)",
    status: game.status || "testing",
    imageUrl: game.imageUrl || "",
    discordLink: game.discordLink || "",
    redditLink: game.redditLink || "",
    wikiLink: game.wikiLink || "",
    steamDBLink: game.steamDBLink || "",
    downloadLink: game.downloadLink || "",
    purchaseLink: game.purchaseLink || "",
    gogDreamlistLink: game.gogDreamlistLink || "",
    virusTotalUrl: game.virusTotalUrl || "",
    instructions: game.instructions || [],
    knownIssues: game.knownIssues || [],
    communityTips: game.communityTips || [],
    additionalDRM: game.additionalDRM || "",
    playabilityStatus: game.playabilityStatus || "",
    isUnplayable: game.isUnplayable || false,
    communityAlternativeName: game.communityAlternativeName || "",
    communityAlternativeUrl: game.communityAlternativeUrl || "",
    communityAlternativeDownloadLink:
      game.communityAlternativeDownloadLink || "",
    remasteredName: game.remasteredName || "",
    remasteredPlatform: game.remasteredPlatform || "",
    submitterNotes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [datePickerValue, setDatePickerValue] = useState<string>("");

  // Handle array fields
  const [currentInstruction, setCurrentInstruction] = useState("");
  const [currentIssue, setCurrentIssue] = useState("");
  const [currentTip, setCurrentTip] = useState("");
  const [currentGenre, setCurrentGenre] = useState("");
  const [currentPlatform, setCurrentPlatform] = useState("");

  // Initialize date picker value from releaseDate
  useEffect(() => {
    if (formData.releaseDate) {
      // Try to parse existing date format (e.g., "May 29, 2007")
      const parsed = new Date(formData.releaseDate);
      if (!isNaN(parsed.getTime())) {
        // Format as YYYY-MM-DD for date input
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        setDatePickerValue(`${year}-${month}-${day}`);
      }
    }
    // Only run on mount to initialize, not when formData.releaseDate changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format date from date picker to "Month DD, YYYY"
  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    return `${month} ${day}, ${year}`;
  };

  // Validate URL
  const isValidUrl = (url: string): boolean => {
    if (!url || url.trim() === "") return true; // Empty is valid (optional field)
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Check if URL is blacklisted
  const checkUrlBlacklist = (
    url: string
  ): { isBlocked: boolean; reason?: string } => {
    if (!url || typeof url !== "string") {
      return { isBlocked: false };
    }

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      // Check NSFW domains
      const nsfwCheck = isNsfwDomainBlocked(url);
      if (nsfwCheck.isBlocked) {
        return nsfwCheck;
      }

      // Block URL shorteners for security
      const urlShorteners = [
        "bit.ly",
        "tinyurl.com",
        "t.co",
        "goo.gl",
        "ow.ly",
        "is.gd",
      ];

      for (const shortener of urlShorteners) {
        if (domain === shortener || domain.endsWith(`.${shortener}`)) {
          return {
            isBlocked: true,
            reason: "URL shorteners are not allowed for security reasons",
          };
        }
      }

      return { isBlocked: false };
    } catch {
      return { isBlocked: false };
    }
  };

  // Validate all URLs before submission
  const validateUrls = (): boolean => {
    const errors: Record<string, string> = {};
    let hasErrors = false;

    const urlFields = [
      { key: "imageUrl", value: formData.imageUrl, label: "Image URL" },
      {
        key: "discordLink",
        value: formData.discordLink,
        label: "Discord Link",
      },
      { key: "redditLink", value: formData.redditLink, label: "Reddit Link" },
      { key: "wikiLink", value: formData.wikiLink, label: "Wiki Link" },
      {
        key: "steamDBLink",
        value: formData.steamDBLink,
        label: "SteamDB Link",
      },
      {
        key: "downloadLink",
        value: formData.downloadLink,
        label: "Download Link",
      },
      {
        key: "purchaseLink",
        value: formData.purchaseLink,
        label: "Purchase Link",
      },
      {
        key: "gogDreamlistLink",
        value: formData.gogDreamlistLink,
        label: "GOG Dreamlist Link",
      },
      {
        key: "virusTotalUrl",
        value: formData.virusTotalUrl,
        label: "VirusTotal URL",
      },
      {
        key: "communityAlternativeUrl",
        value: formData.communityAlternativeUrl,
        label: "Community Alternative Website URL",
      },
      {
        key: "communityAlternativeDownloadLink",
        value: formData.communityAlternativeDownloadLink,
        label: "Community Alternative Download Link",
      },
    ];

    urlFields.forEach(({ key, value, label }) => {
      if (value) {
        if (!isValidUrl(value)) {
          errors[key] = `${label} must be a valid URL`;
          hasErrors = true;
        } else {
          // Check domain-specific validation
          const domainError = getUrlValidationError(key, value);
          if (domainError) {
            errors[key] = domainError;
            hasErrors = true;
          } else {
            // Check blacklist (NSFW, unsafe domains, URL shorteners)
            const blacklistCheck = checkUrlBlacklist(value);
            if (blacklistCheck.isBlocked) {
              errors[key] = blacklistCheck.reason || "This URL is not allowed";
              hasErrors = true;
            } else {
              // For non-download fields, check if URL is a direct download link
              if (key !== "downloadLink" && key !== "communityAlternativeDownloadLink") {
                const downloadCheck = isDirectDownloadLink(value);
                if (downloadCheck.isDirectDownload) {
                  errors[key] = downloadCheck.reason || "Direct download links are not allowed in this field";
                  hasErrors = true;
                }
              }
            }
          }
        }
      }
    });

    setUrlErrors(errors);
    return !hasErrors;
  };

  // Helper to handle URL field changes with validation
  const handleUrlChange = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
    // Clear error when user types
    if (urlErrors[key]) {
      setUrlErrors({ ...urlErrors, [key]: "" });
    }
  };

  // Helper to validate URL on blur
  const handleUrlBlur = (key: string, value: string, label: string) => {
    if (value) {
      if (!isValidUrl(value)) {
        setUrlErrors({
          ...urlErrors,
          [key]: `${label} must be a valid URL`,
        });
      } else {
        // Check domain-specific validation
        const domainError = getUrlValidationError(key, value);
        if (domainError) {
          setUrlErrors({
            ...urlErrors,
            [key]: domainError,
          });
        } else {
          // Check blacklist (NSFW, unsafe domains, URL shorteners)
          const blacklistCheck = checkUrlBlacklist(value);
          if (blacklistCheck.isBlocked) {
            setUrlErrors({
              ...urlErrors,
              [key]: blacklistCheck.reason || "This URL is not allowed",
            });
          } else {
            // For non-download fields, check if URL is a direct download link
            if (key !== "downloadLink" && key !== "communityAlternativeDownloadLink") {
              const downloadCheck = isDirectDownloadLink(value);
              if (downloadCheck.isDirectDownload) {
                setUrlErrors({
                  ...urlErrors,
                  [key]: downloadCheck.reason || "Direct download links are not allowed in this field",
                });
                return;
              }
            }
            // Clear error if URL is valid and not blacklisted
            if (urlErrors[key]) {
              const newErrors = { ...urlErrors };
              delete newErrors[key];
              setUrlErrors(newErrors);
            }
          }
        }
      }
    }
  };

  const handleAddItem = (
    field:
      | "instructions"
      | "knownIssues"
      | "communityTips"
      | "genres"
      | "platforms",
    value: string,
    setter: (val: string) => void
  ) => {
    if (value.trim()) {
      setFormData({
        ...formData,
        [field]: [...(formData[field] as string[]), value.trim()],
      });
      setter("");
    }
  };

  const handleRemoveItem = (
    field:
      | "instructions"
      | "knownIssues"
      | "communityTips"
      | "genres"
      | "platforms",
    index: number
  ) => {
    setFormData({
      ...formData,
      [field]: (formData[field] as string[]).filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (isSubmitting) {
      showToast("Please wait, submission in progress...", 2000, "error");
      return;
    }

    // Clear previous errors
    setError("");

    // DMCA Protection: Prevent download links if game is still being sold
    if (formData.downloadLink) {
      if (formData.remasteredName) {
        setError(
          "Download links cannot be added for games with available remasters. This helps protect against DMCA issues. Please remove the remastered name or the download link."
        );
        setIsSubmitting(false);
        return;
      }
      if (formData.purchaseLink) {
        setError(
          "Download links cannot be added when a purchase link exists. This helps protect against DMCA issues. Please remove the purchase link or the download link."
        );
        setIsSubmitting(false);
        return;
      }
    }

    // Validate URLs before submission
    if (!validateUrls()) {
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    try {
      // Format release date if date picker was used
      const formattedReleaseDate = datePickerValue
        ? formatDate(datePickerValue)
        : formData.releaseDate || undefined;

      if (!csrfToken) {
        showToast("Security token not ready. Please wait...", 3000, "error");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/game-submissions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          gameSlug: game.slug,
          gameTitle: game.title,
          submittedBy: userId,
          submittedByName: userName,
          proposedData: {
            title: formData.title || undefined,
            description: formData.description || undefined,
            releaseDate: formattedReleaseDate,
            developer: formData.developer || undefined,
            publisher: formData.publisher || undefined,
            genres: formData.genres.length > 0 ? formData.genres : undefined,
            platforms:
              formData.platforms.length > 0 ? formData.platforms : undefined,
            activationType: formData.activationType || undefined,
            status: formData.status || undefined,
            imageUrl: formData.imageUrl || undefined,
            discordLink: formData.discordLink || undefined,
            redditLink: formData.redditLink || undefined,
            wikiLink: formData.wikiLink || undefined,
            steamDBLink: formData.steamDBLink || undefined,
            downloadLink: formData.downloadLink || undefined,
            purchaseLink: formData.purchaseLink || undefined,
            gogDreamlistLink: formData.gogDreamlistLink || undefined,
            virusTotalUrl: formData.virusTotalUrl || undefined,
            instructions:
              formData.instructions.length > 0
                ? formData.instructions
                : undefined,
            knownIssues:
              formData.knownIssues.length > 0
                ? formData.knownIssues
                : undefined,
            communityTips:
              formData.communityTips.length > 0
                ? formData.communityTips
                : undefined,
            additionalDRM: formData.additionalDRM || undefined,
            playabilityStatus: formData.playabilityStatus || undefined,
            isUnplayable: formData.isUnplayable || undefined,
            communityAlternativeName:
              formData.communityAlternativeName || undefined,
            communityAlternativeUrl:
              formData.communityAlternativeUrl || undefined,
            communityAlternativeDownloadLink:
              formData.communityAlternativeDownloadLink || undefined,
            remasteredName: formData.remasteredName || undefined,
            remasteredPlatform: formData.remasteredPlatform || undefined,
          },
          submitterNotes: formData.submitterNotes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit game details");
      }

      onSubmit();
      onClose();
      
      // Refresh UI
      if (pathname === "/dashboard/games" || pathname === "/dashboard/game-submissions") {
        router.refresh();
      }
      router.refresh();
      showToast("Game details submitted successfully!", 3000, "success");
    } catch (error) {
      safeLog.error("Error submitting game details:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to submit game details. Please try again.",
        5000,
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[rgb(var(--bg-card))] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[rgb(var(--border-color))] my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[rgb(var(--bg-card))] border-b border-[rgb(var(--border-color))] p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))]">
              Add Game Details
            </h2>
            <p className="text-[rgb(var(--text-secondary))] text-sm mt-1">
              Help us fill in information for {game.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
            aria-label="Close modal"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-800 dark:text-blue-300 text-sm">
              Fill in as much information as you can. All fields are optional.
              Your submission will be reviewed before being published.
            </p>
          </div>

          {/* General Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-300 text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* URL Validation Errors */}
          {Object.keys(urlErrors).length > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-300 text-sm font-semibold mb-2">
                Please fix the following errors:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {Object.values(urlErrors).map((error, index) => (
                  <li key={index} className="text-red-300 text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] border-b border-[rgb(var(--border-color))] pb-2">
              Basic Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
                placeholder="Game title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
                placeholder="Brief description of the game"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Release Date
                </label>
                <input
                  type="date"
                  value={datePickerValue}
                  onChange={(e) => {
                    setDatePickerValue(e.target.value);
                    if (e.target.value) {
                      setFormData({
                        ...formData,
                        releaseDate: formatDate(e.target.value),
                      });
                    } else {
                      setFormData({ ...formData, releaseDate: "" });
                    }
                  }}
                  className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                  min="1900-01-01"
                  max={new Date().toISOString().split("T")[0]}
                />
                {formData.releaseDate && (
                  <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">
                    Selected: {formData.releaseDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Developer
                </label>
                <input
                  type="text"
                  value={formData.developer}
                  onChange={(e) =>
                    setFormData({ ...formData, developer: e.target.value })
                  }
                  className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
                  placeholder="Developer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Publisher
                </label>
                <input
                  type="text"
                  value={formData.publisher}
                  onChange={(e) =>
                    setFormData({ ...formData, publisher: e.target.value })
                  }
                  className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
                  placeholder="Publisher name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    // Clear error when user types
                    if (urlErrors.imageUrl) {
                      setUrlErrors({ ...urlErrors, imageUrl: "" });
                    }
                  }}
                  onBlur={() => {
                    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
                      setUrlErrors({
                        ...urlErrors,
                        imageUrl: "Image URL must be a valid URL",
                      });
                    }
                  }}
                  className={`w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
                    urlErrors.imageUrl ? "border border-red-500" : ""
                  }`}
                  placeholder="https://example.com/image.jpg"
                />
                {urlErrors.imageUrl ? (
                  <p className="text-xs text-red-400 mt-1">
                    {urlErrors.imageUrl}
                  </p>
                ) : (
                  <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
                    High-quality box art or cover image
                  </p>
                )}
                {formData.imageUrl && (
                  <UrlSafetyIndicator
                    url={formData.imageUrl}
                    className="mt-1"
                  />
                )}
              </div>
            </div>

            {/* Genres */}
            <div>
              <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                Genres
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentGenre}
                  onChange={(e) => setCurrentGenre(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem("genres", currentGenre, setCurrentGenre);
                    }
                  }}
                  className="flex-1 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                  placeholder="Add a genre"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleAddItem("genres", currentGenre, setCurrentGenre)
                  }
                  className="bg-[#107c10] hover:bg-[#0d6b0d] text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FaPlus />
                </button>
              </div>
              {formData.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.genres.map((genre, index) => (
                    <div
                      key={index}
                      className="bg-[rgb(var(--bg-card-alt))] rounded px-2.5 py-1 flex items-center gap-1.5"
                    >
                      <span className="text-[rgb(var(--text-primary))] text-xs">
                        {genre}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem("genres", index)}
                        className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                        aria-label={`Remove ${genre}`}
                      >
                        <FaTrash size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Platforms */}
            <div>
              <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                Platforms
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentPlatform}
                  onChange={(e) => setCurrentPlatform(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem(
                        "platforms",
                        currentPlatform,
                        setCurrentPlatform
                      );
                    }
                  }}
                  className="flex-1 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                  placeholder="Add a platform"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleAddItem(
                      "platforms",
                      currentPlatform,
                      setCurrentPlatform
                    )
                  }
                  className="bg-[#107c10] hover:bg-[#0d6b0d] text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FaPlus />
                </button>
              </div>
              {formData.platforms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.platforms.map((platform, index) => (
                    <div
                      key={index}
                      className="bg-[rgb(var(--bg-card-alt))] rounded px-2.5 py-1 flex items-center gap-1.5"
                    >
                      <span className="text-[rgb(var(--text-primary))] text-xs">
                        {platform}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem("platforms", index)}
                        className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                        aria-label={`Remove ${platform}`}
                      >
                        <FaTrash size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional DRM */}
            <div>
              <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                Additional DRM
              </label>
              <select
                value={
                  formData.additionalDRM &&
                  ![
                    "Disc (SafeDisc/SecuROM/etc)",
                    "Date check (SecuROM/ZDPP)",
                    "Activation (SecuROM/custom)",
                  ].includes(formData.additionalDRM)
                    ? "Other"
                    : formData.additionalDRM
                }
                onChange={(e) => {
                  if (e.target.value === "Other") {
                    // Keep the current value if it's already a custom value
                    setFormData({
                      ...formData,
                      additionalDRM:
                        formData.additionalDRM &&
                        ![
                          "Disc (SafeDisc/SecuROM/etc)",
                          "Date check (SecuROM/ZDPP)",
                          "Activation (SecuROM/custom)",
                        ].includes(formData.additionalDRM)
                          ? formData.additionalDRM
                          : "",
                    });
                  } else {
                    setFormData({
                      ...formData,
                      additionalDRM: e.target.value,
                    });
                  }
                }}
                className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
              >
                <option value="">None</option>
                <option value="Disc (SafeDisc/SecuROM/etc)">
                  Disc (SafeDisc/SecuROM/etc)
                </option>
                <option value="Date check (SecuROM/ZDPP)">
                  Date check (SecuROM/ZDPP)
                </option>
                <option value="Activation (SecuROM/custom)">
                  Activation (SecuROM/custom)
                </option>
                <option value="Other">Other</option>
              </select>
              {formData.additionalDRM &&
                ![
                  "Disc (SafeDisc/SecuROM/etc)",
                  "Date check (SecuROM/ZDPP)",
                  "Activation (SecuROM/custom)",
                ].includes(formData.additionalDRM) && (
                  <input
                    type="text"
                    value={formData.additionalDRM}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        additionalDRM: e.target.value,
                      });
                    }}
                    placeholder="Enter custom DRM..."
                    className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                  />
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Activation Type
                </label>
                <select
                  value={formData.activationType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      activationType: e.target.value as
                        | "Legacy (5x5)"
                        | "Legacy (Per-Title)"
                        | "SSA",
                    })
                  }
                  className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
                >
                  <option value="Legacy (5x5)">Legacy (5x5)</option>
                  <option value="Legacy (Per-Title)">Legacy (Per-Title)</option>
                  <option value="SSA">SSA</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Support Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as
                        | "supported"
                        | "testing"
                        | "unsupported",
                    })
                  }
                  className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
                >
                  <option value="supported">Supported</option>
                  <option value="testing">Testing</option>
                  <option value="unsupported">Unsupported</option>
                </select>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] border-b border-[rgb(var(--border-color))] pb-2">
              Links & Resources
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Discord Link
                </label>
                <input
                  type="url"
                  value={formData.discordLink}
                  onChange={(e) =>
                    handleUrlChange("discordLink", e.target.value)
                  }
                  onBlur={(e) =>
                    handleUrlBlur("discordLink", e.target.value, "Discord Link")
                  }
                  className={`w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
                    urlErrors.discordLink ? "border border-red-500" : ""
                  }`}
                  placeholder="https://discord.gg/..."
                />
                {urlErrors.discordLink && (
                  <p className="text-xs text-red-400 mt-1">
                    {urlErrors.discordLink}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Reddit Link
                </label>
                <input
                  type="url"
                  value={formData.redditLink}
                  onChange={(e) =>
                    handleUrlChange("redditLink", e.target.value)
                  }
                  onBlur={(e) =>
                    handleUrlBlur("redditLink", e.target.value, "Reddit Link")
                  }
                  className={`w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
                    urlErrors.redditLink ? "border border-red-500" : ""
                  }`}
                  placeholder="https://reddit.com/r/..."
                />
                {urlErrors.redditLink && (
                  <p className="text-xs text-red-400 mt-1">
                    {urlErrors.redditLink}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Wiki Link
                </label>
                <input
                  type="url"
                  value={formData.wikiLink}
                  onChange={(e) => handleUrlChange("wikiLink", e.target.value)}
                  onBlur={(e) =>
                    handleUrlBlur("wikiLink", e.target.value, "Wiki Link")
                  }
                  className={`w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
                    urlErrors.wikiLink ? "border border-red-500" : ""
                  }`}
                  placeholder="https://..."
                />
                {urlErrors.wikiLink && (
                  <p className="text-xs text-red-400 mt-1">
                    {urlErrors.wikiLink}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  SteamDB Link
                </label>
                <input
                  type="url"
                  value={formData.steamDBLink}
                  onChange={(e) =>
                    handleUrlChange("steamDBLink", e.target.value)
                  }
                  onBlur={(e) =>
                    handleUrlBlur("steamDBLink", e.target.value, "SteamDB Link")
                  }
                  className={`w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
                    urlErrors.steamDBLink ? "border border-red-500" : ""
                  }`}
                  placeholder="https://steamdb.info/app/..."
                />
                {urlErrors.steamDBLink && (
                  <p className="text-xs text-red-400 mt-1">
                    {urlErrors.steamDBLink}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Download Link
                </label>
                <input
                  type="url"
                  value={formData.downloadLink}
                  onChange={(e) =>
                    handleUrlChange("downloadLink", e.target.value)
                  }
                  onBlur={(e) =>
                    handleUrlBlur(
                      "downloadLink",
                      e.target.value,
                      "Download Link"
                    )
                  }
                  className={`w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
                    urlErrors.downloadLink ? "border border-red-500" : ""
                  }`}
                  placeholder="https://..."
                  disabled={
                    !!(formData.remasteredName || formData.purchaseLink)
                  }
                />
                {(formData.remasteredName || formData.purchaseLink) && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    ⚠️ Download links are disabled when remasters or purchase
                    links exist to protect against DMCA issues.
                  </p>
                )}
                {formData.downloadLink && !formData.virusTotalUrl && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    ⚠️ Security: Consider adding a VirusTotal scan URL for this
                    download link.
                  </p>
                )}
                {urlErrors.downloadLink && (
                  <p className="text-xs text-red-400 mt-1">
                    {urlErrors.downloadLink}
                  </p>
                )}
                {formData.downloadLink && (
                  <UrlSafetyIndicator
                    url={formData.downloadLink}
                    className="mt-1"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Purchase Link
                </label>
                <input
                  type="url"
                  value={formData.purchaseLink}
                  onChange={(e) =>
                    handleUrlChange("purchaseLink", e.target.value)
                  }
                  onBlur={(e) =>
                    handleUrlBlur(
                      "purchaseLink",
                      e.target.value,
                      "Purchase Link"
                    )
                  }
                  className={`w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
                    urlErrors.purchaseLink ? "border border-red-500" : ""
                  }`}
                  placeholder="https://..."
                />
                {urlErrors.purchaseLink && (
                  <p className="text-xs text-red-400 mt-1">
                    {urlErrors.purchaseLink}
                  </p>
                )}
                {formData.purchaseLink && (
                  <UrlSafetyIndicator
                    url={formData.purchaseLink}
                    className="mt-1"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  GOG Dreamlist Link
                </label>
                <input
                  type="url"
                  value={formData.gogDreamlistLink}
                  onChange={(e) =>
                    handleUrlChange("gogDreamlistLink", e.target.value)
                  }
                  onBlur={(e) =>
                    handleUrlBlur(
                      "gogDreamlistLink",
                      e.target.value,
                      "GOG Dreamlist Link"
                    )
                  }
                  className={`w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
                    urlErrors.gogDreamlistLink ? "border border-red-500" : ""
                  }`}
                  placeholder="https://..."
                />
                {urlErrors.gogDreamlistLink && (
                  <p className="text-xs text-red-400 mt-1">
                    {urlErrors.gogDreamlistLink}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  VirusTotal URL
                </label>
                <input
                  type="url"
                  value={formData.virusTotalUrl}
                  onChange={(e) =>
                    handleUrlChange("virusTotalUrl", e.target.value)
                  }
                  onBlur={(e) =>
                    handleUrlBlur(
                      "virusTotalUrl",
                      e.target.value,
                      "VirusTotal URL"
                    )
                  }
                  className={`w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
                    urlErrors.virusTotalUrl ? "border border-red-500" : ""
                  }`}
                  placeholder="https://virustotal.com/..."
                />
                {urlErrors.virusTotalUrl && (
                  <p className="text-xs text-red-400 mt-1">
                    {urlErrors.virusTotalUrl}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Array Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] border-b border-[rgb(var(--border-color))] pb-2">
              Additional Details
            </h3>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                Installation Instructions
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentInstruction}
                  onChange={(e) => setCurrentInstruction(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem(
                        "instructions",
                        currentInstruction,
                        setCurrentInstruction
                      );
                    }
                  }}
                  className="flex-1 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                  placeholder="Add an instruction step"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleAddItem(
                      "instructions",
                      currentInstruction,
                      setCurrentInstruction
                    )
                  }
                  className="bg-[#107c10] hover:bg-[#0d6b0d] text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FaPlus />
                </button>
              </div>
              {formData.instructions.length > 0 && (
                <ul className="space-y-2">
                  {formData.instructions.map((instruction, index) => (
                    <li
                      key={index}
                      className="bg-[rgb(var(--bg-card-alt))] rounded-lg px-4 py-2 flex items-center justify-between"
                    >
                      <span className="text-[rgb(var(--text-primary))] text-sm">
                        {index + 1}. {instruction}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem("instructions", index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <FaTrash size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Known Issues */}
            <div>
              <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                Known Issues
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentIssue}
                  onChange={(e) => setCurrentIssue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem(
                        "knownIssues",
                        currentIssue,
                        setCurrentIssue
                      );
                    }
                  }}
                  className="flex-1 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                  placeholder="Add a known issue"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleAddItem("knownIssues", currentIssue, setCurrentIssue)
                  }
                  className="bg-[#107c10] hover:bg-[#0d6b0d] text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FaPlus />
                </button>
              </div>
              {formData.knownIssues.length > 0 && (
                <ul className="space-y-2">
                  {formData.knownIssues.map((issue, index) => (
                    <li
                      key={index}
                      className="bg-[rgb(var(--bg-card-alt))] rounded-lg px-4 py-2 flex items-center justify-between"
                    >
                      <span className="text-[rgb(var(--text-primary))] text-sm">
                        {issue}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem("knownIssues", index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <FaTrash size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Community Tips */}
            <div>
              <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                Community Tips
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentTip}
                  onChange={(e) => setCurrentTip(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem("communityTips", currentTip, setCurrentTip);
                    }
                  }}
                  className="flex-1 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                  placeholder="Add a community tip"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleAddItem("communityTips", currentTip, setCurrentTip)
                  }
                  className="bg-[#107c10] hover:bg-[#0d6b0d] text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FaPlus />
                </button>
              </div>
              {formData.communityTips.length > 0 && (
                <ul className="space-y-2">
                  {formData.communityTips.map((tip, index) => (
                    <li
                      key={index}
                      className="bg-[rgb(var(--bg-card-alt))] rounded-lg px-4 py-2 flex items-center justify-between"
                    >
                      <span className="text-[rgb(var(--text-primary))] text-sm">
                        {tip}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem("communityTips", index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <FaTrash size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Playability Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] border-b border-[rgb(var(--border-color))] pb-2">
              Playability Status
            </h3>

            <div>
              <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                Playability Status
              </label>
              <select
                value={formData.playabilityStatus}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  setFormData({
                    ...formData,
                    playabilityStatus: newStatus,
                    // Auto-check isUnplayable if status is "unplayable"
                    // Auto-uncheck if status is "playable"
                    isUnplayable:
                      newStatus === "unplayable"
                        ? true
                        : newStatus === "playable"
                        ? false
                        : formData.isUnplayable,
                  });
                }}
                className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
              >
                <option value="">Select status...</option>
                <option value="playable">Playable</option>
                <option value="unplayable">Unplayable</option>
                <option value="community_alternative">
                  Community Alternative
                </option>
                <option value="remastered_available">
                  Remastered Available
                </option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isUnplayable"
                checked={formData.isUnplayable}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isUnplayable: e.target.checked,
                  })
                }
                className="w-4 h-4 text-[#107c10] bg-[rgb(var(--bg-card-alt))] border-[rgb(var(--border-color))] rounded focus:ring-[#107c10] focus:ring-2"
              />
              <label
                htmlFor="isUnplayable"
                className="ml-2 text-sm font-medium text-[rgb(var(--text-primary))]"
              >
                Original game is unplayable
              </label>
            </div>

            {formData.playabilityStatus === "community_alternative" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                    Community Alternative Name
                  </label>
                  <input
                    type="text"
                    value={formData.communityAlternativeName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        communityAlternativeName: e.target.value,
                      })
                    }
                    placeholder="e.g., Project Name"
                    className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                    Website URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.communityAlternativeUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        communityAlternativeUrl: e.target.value,
                      })
                    }
                    placeholder="https://example.com"
                    className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
                  />
                  <p className="text-gray-600 dark:text-[rgb(var(--text-secondary))] text-xs mt-1">
                    Link to the community alternative&apos;s website or store
                    page
                  </p>
                  {formData.communityAlternativeUrl && (
                    <UrlSafetyIndicator
                      url={formData.communityAlternativeUrl}
                      className="mt-1"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                    Direct Download Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.communityAlternativeDownloadLink}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        communityAlternativeDownloadLink: e.target.value,
                      })
                    }
                    placeholder="https://example.com/download"
                    className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
                  />
                  <p className="text-gray-600 dark:text-[rgb(var(--text-secondary))] text-xs mt-1">
                    Direct download link for the community alternative (if
                    available)
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    ⚠️ Security: All download links are reviewed by admins.
                    Malicious links will result in account bans.
                  </p>
                  {formData.communityAlternativeDownloadLink && (
                    <UrlSafetyIndicator
                      url={formData.communityAlternativeDownloadLink}
                      className="mt-1"
                    />
                  )}
                </div>
              </div>
            )}

            {formData.playabilityStatus === "remastered_available" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                    Remastered Name
                  </label>
                  <input
                    type="text"
                    value={formData.remasteredName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        remasteredName: e.target.value,
                      })
                    }
                    placeholder="e.g., Remastered Name"
                    className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                    Remastered Platform
                  </label>
                  <input
                    type="text"
                    value={formData.remasteredPlatform}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        remasteredPlatform: e.target.value,
                      })
                    }
                    placeholder="e.g., Platform Name"
                    className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submitter Notes */}
          <div>
            <label className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.submitterNotes}
              onChange={(e) =>
                setFormData({ ...formData, submitterNotes: e.target.value })
              }
              rows={3}
              className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
              placeholder="Any additional information or context for reviewers..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] font-semibold py-3 px-6 rounded-lg transition-colors border border-[rgb(var(--border-color))]"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#107c10] hover:bg-[#0d6b0d] text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
