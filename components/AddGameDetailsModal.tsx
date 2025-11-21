"use client";

import { useState, useEffect } from "react";
import { FaTimes, FaPlus, FaTrash } from "react-icons/fa";
import { Game } from "@/data/games";

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
    submitterNotes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});
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
    ];

    urlFields.forEach(({ key, value, label }) => {
      if (value && !isValidUrl(value)) {
        errors[key] = `${label} must be a valid URL`;
        hasErrors = true;
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
    if (value && !isValidUrl(value)) {
      setUrlErrors({
        ...urlErrors,
        [key]: `${label} must be a valid URL`,
      });
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

      const response = await fetch("/api/game-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch (error) {
      console.error("Error submitting game details:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to submit game details. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[#2d2d2d] my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#2d2d2d] p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">Add Game Details</h2>
            <p className="text-gray-400 text-sm mt-1">
              Help us fill in information for {game.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              Fill in as much information as you can. All fields are optional.
              Your submission will be reviewed before being published.
            </p>
          </div>

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
            <h3 className="text-lg font-semibold text-white border-b border-[#2d2d2d] pb-2">
              Basic Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                placeholder="Game title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                placeholder="Brief description of the game"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] [color-scheme:dark]"
                  min="1900-01-01"
                  max={new Date().toISOString().split("T")[0]}
                />
                {formData.releaseDate && (
                  <p className="text-xs text-gray-400 mt-1">
                    Selected: {formData.releaseDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Developer
                </label>
                <input
                  type="text"
                  value={formData.developer}
                  onChange={(e) =>
                    setFormData({ ...formData, developer: e.target.value })
                  }
                  className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                  placeholder="Developer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Publisher
                </label>
                <input
                  type="text"
                  value={formData.publisher}
                  onChange={(e) =>
                    setFormData({ ...formData, publisher: e.target.value })
                  }
                  className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                  placeholder="Publisher name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className={`w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
                    urlErrors.imageUrl ? "border border-red-500" : ""
                  }`}
                  placeholder="https://example.com/image.jpg"
                />
                {urlErrors.imageUrl ? (
                  <p className="text-xs text-red-400 mt-1">
                    {urlErrors.imageUrl}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    High-quality box art or cover image
                  </p>
                )}
              </div>
            </div>

            {/* Genres */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className="flex-1 bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
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
                      className="bg-[#2d2d2d] rounded px-2.5 py-1 flex items-center gap-1.5"
                    >
                      <span className="text-white text-xs">{genre}</span>
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className="flex-1 bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
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
                      className="bg-[#2d2d2d] rounded px-2.5 py-1 flex items-center gap-1.5"
                    >
                      <span className="text-white text-xs">{platform}</span>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                >
                  <option value="Legacy (5x5)">Legacy (5x5)</option>
                  <option value="Legacy (Per-Title)">Legacy (Per-Title)</option>
                  <option value="SSA">SSA</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
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
            <h3 className="text-lg font-semibold text-white border-b border-[#2d2d2d] pb-2">
              Links & Resources
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className={`w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className={`w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Wiki Link
                </label>
                <input
                  type="url"
                  value={formData.wikiLink}
                  onChange={(e) => handleUrlChange("wikiLink", e.target.value)}
                  onBlur={(e) =>
                    handleUrlBlur("wikiLink", e.target.value, "Wiki Link")
                  }
                  className={`w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className={`w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className={`w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
                    urlErrors.downloadLink ? "border border-red-500" : ""
                  }`}
                  placeholder="https://..."
                />
                {urlErrors.downloadLink && (
                  <p className="text-xs text-red-400 mt-1">
                    {urlErrors.downloadLink}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className={`w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
                    urlErrors.purchaseLink ? "border border-red-500" : ""
                  }`}
                  placeholder="https://..."
                />
                {urlErrors.purchaseLink && (
                  <p className="text-xs text-red-400 mt-1">
                    {urlErrors.purchaseLink}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className={`w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className={`w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] ${
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
            <h3 className="text-lg font-semibold text-white border-b border-[#2d2d2d] pb-2">
              Additional Details
            </h3>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className="flex-1 bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
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
                      className="bg-[#2d2d2d] rounded-lg px-4 py-2 flex items-center justify-between"
                    >
                      <span className="text-white text-sm">
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className="flex-1 bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
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
                      className="bg-[#2d2d2d] rounded-lg px-4 py-2 flex items-center justify-between"
                    >
                      <span className="text-white text-sm">{issue}</span>
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className="flex-1 bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
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
                      className="bg-[#2d2d2d] rounded-lg px-4 py-2 flex items-center justify-between"
                    >
                      <span className="text-white text-sm">{tip}</span>
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

          {/* Submitter Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.submitterNotes}
              onChange={(e) =>
                setFormData({ ...formData, submitterNotes: e.target.value })
              }
              rows={3}
              className="w-full bg-[#2d2d2d] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
              placeholder="Any additional information or context for reviewers..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
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
