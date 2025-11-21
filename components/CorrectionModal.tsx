"use client";

import { useState, useEffect } from "react";
import { FaTimes, FaCheck, FaEdit } from "react-icons/fa";
import { Game } from "@/data/games";
import { CorrectionField } from "@/types/crowdsource";

interface CorrectionModalProps {
  game: Game;
  onClose: () => void;
  onSubmit: () => void;
  userEmail: string;
  userName: string;
}

export default function CorrectionModal({
  game,
  onClose,
  onSubmit,
  userEmail,
  userName,
}: CorrectionModalProps) {
  const [field, setField] = useState<CorrectionField | "">("");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [datePickerValue, setDatePickerValue] = useState<string>("");

  // Format date from date picker to "Month DD, YYYY"
  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
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

  // Initialize date picker when releaseDate field is selected
  useEffect(() => {
    if (field === "releaseDate") {
      const currentDate = getFieldValue("releaseDate");
      if (currentDate && typeof currentDate === "string") {
        // Try to parse existing date format (e.g., "May 29, 2007")
        const parsed = new Date(currentDate);
        if (!isNaN(parsed.getTime())) {
          // Format as YYYY-MM-DD for date input
          const year = parsed.getFullYear();
          const month = String(parsed.getMonth() + 1).padStart(2, "0");
          const day = String(parsed.getDate()).padStart(2, "0");
          setDatePickerValue(`${year}-${month}-${day}`);
        }
      } else {
        setDatePickerValue("");
      }
    } else {
      setDatePickerValue("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field]);

  // Map of fields to their current values
  const getFieldValue = (fieldName: CorrectionField): string | string[] | undefined => {
    switch (fieldName) {
      case "title":
        return game.title;
      case "description":
        return game.description;
      case "releaseDate":
        return game.releaseDate;
      case "developer":
        return game.developer;
      case "publisher":
        return game.publisher;
      case "genres":
        return game.genres?.join(", ") || "";
      case "platforms":
        return game.platforms?.join(", ") || "";
      case "activationType":
        return game.activationType;
      case "status":
        return game.status;
      case "instructions":
        return game.instructions?.join("\n") || "";
      case "knownIssues":
        return game.knownIssues?.join("\n") || "";
      case "communityTips":
        return game.communityTips?.join("\n") || "";
      case "discordLink":
        return game.discordLink || "";
      case "redditLink":
        return game.redditLink || "";
      case "wikiLink":
        return game.wikiLink || "";
      case "steamDBLink":
        return game.steamDBLink || "";
      case "purchaseLink":
        return game.purchaseLink || "";
      case "gogDreamlistLink":
        return game.gogDreamlistLink || "";
      case "imageUrl":
        return game.imageUrl || "";
      default:
        return "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!field) {
      setError("Please select a field to correct");
      return;
    }
    
    // Validate URL fields
    const urlFields: CorrectionField[] = [
      "imageUrl",
      "discordLink",
      "redditLink",
      "wikiLink",
      "steamDBLink",
      "purchaseLink",
      "gogDreamlistLink",
    ];
    
    if (urlFields.includes(field as CorrectionField)) {
      if (!isValidUrl(newValue.trim())) {
        setUrlError(`${field} must be a valid URL`);
        setError(`${field} must be a valid URL`);
        return;
      }
    }
    
    // Allow empty values for clearing fields (except for required fields)
    const requiredFields: CorrectionField[] = ["title", "status", "activationType"];
    if (requiredFields.includes(field as CorrectionField)) {
      if (!newValue.trim() && field !== "releaseDate") {
        setError("Please provide a new value");
        return;
      }
      if (field === "releaseDate" && !datePickerValue) {
        setError("Please select a release date");
        return;
      }
    } else {
      // For optional fields, allow empty to clear, but still validate URLs if provided
      if (field === "releaseDate" && datePickerValue) {
        // If date picker has a value, that's fine
      } else if (field !== "releaseDate" && newValue.trim()) {
        // If there's a value, validate it (URL validation already handled above)
      }
      // If empty, that's fine - it will clear the field
    }
    
    if (!reason.trim()) {
      setError("Please provide a reason for this correction");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setUrlError("");

    try {
      // Process newValue - handle empty values for clearing fields
      let processedNewValue: string | string[] | null;
      if (field === "releaseDate") {
        processedNewValue = datePickerValue ? formatDate(datePickerValue) : null;
      } else if (field === "genres" || field === "platforms") {
        processedNewValue = newValue.trim()
          ? newValue.split(",").map(v => v.trim()).filter(v => v)
          : null;
      } else if (field === "instructions" || field === "knownIssues" || field === "communityTips") {
        processedNewValue = newValue.trim()
          ? newValue.split("\n").map(v => v.trim()).filter(v => v)
          : null;
      } else {
        processedNewValue = newValue.trim() || null;
      }

      const response = await fetch("/api/corrections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: game.id,
          gameSlug: game.slug,
          gameTitle: game.title,
          field,
          oldValue: getFieldValue(field as CorrectionField),
          newValue: processedNewValue,
          reason,
          userEmail,
          userName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit correction");
      }

      onSubmit();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit correction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentValue = field ? getFieldValue(field as CorrectionField) : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#2d2d2d] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#2d2d2d] border-b border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <FaEdit />
                Submit Correction
              </h2>
              <p className="text-gray-400 text-sm">{game.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Field Selection */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Field to Correct *
            </label>
            <select
              value={field}
              onChange={(e) => {
                setField(e.target.value as CorrectionField);
                setNewValue("");
              }}
              className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
              required
            >
              <option value="">Select a field...</option>
              <option value="title">Title</option>
              <option value="description">Description</option>
              <option value="releaseDate">Release Date</option>
              <option value="developer">Developer</option>
              <option value="publisher">Publisher</option>
              <option value="genres">Genres (comma-separated)</option>
              <option value="platforms">Platforms (comma-separated)</option>
              <option value="activationType">Activation Type</option>
              <option value="status">Status</option>
              <option value="imageUrl">Box Art / Cover Image URL</option>
              <option value="instructions">Instructions (one per line)</option>
              <option value="knownIssues">Known Issues (one per line)</option>
              <option value="communityTips">Community Tips (one per line)</option>
              <option value="discordLink">Discord Link</option>
              <option value="redditLink">Reddit Link</option>
              <option value="wikiLink">Wiki Link</option>
              <option value="steamDBLink">SteamDB Link</option>
              <option value="purchaseLink">Purchase Link</option>
              <option value="gogDreamlistLink">GOG Dreamlist Link</option>
            </select>
          </div>

          {/* Current Value */}
          {field && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Current Value
              </label>
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-700">
                <pre className="text-gray-400 text-sm whitespace-pre-wrap break-all">
                  {currentValue || "N/A"}
                </pre>
              </div>
            </div>
          )}

          {/* New Value */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              New Value {!["title", "status", "activationType"].includes(field || "") ? "(leave empty to clear)" : "*"}
            </label>
            {field === "description" ||
            field === "instructions" ||
            field === "knownIssues" ||
            field === "communityTips" ? (
              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={!["title", "status", "activationType"].includes(field || "") ? "Enter the corrected value (or leave empty to clear)..." : "Enter the corrected value..."}
                className="w-full p-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
                rows={6}
                required={["title", "status", "activationType"].includes(field || "")}
              />
            ) : field === "activationType" ? (
              <select
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
                required
              >
                <option value="">Select activation type...</option>
                <option value="Legacy (5x5)">Legacy (5x5)</option>
                <option value="Legacy (Per-Title)">Legacy (Per-Title)</option>
                <option value="SSA">SSA</option>
              </select>
            ) : field === "status" ? (
              <select
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
                required
              >
                <option value="">Select status...</option>
                <option value="supported">Supported</option>
                <option value="testing">Testing</option>
                <option value="unsupported">Unsupported</option>
              </select>
            ) : field === "releaseDate" ? (
              <div>
                <input
                  type="date"
                  value={datePickerValue}
                  onChange={(e) => {
                    setDatePickerValue(e.target.value);
                    if (e.target.value) {
                      setNewValue(formatDate(e.target.value));
                    } else {
                      setNewValue("");
                    }
                  }}
                  className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none [color-scheme:dark]"
                  min="1900-01-01"
                  max={new Date().toISOString().split("T")[0]}
                />
                {newValue && (
                  <p className="text-xs text-gray-400 mt-1">
                    Selected: {newValue}
                  </p>
                )}
              </div>
            ) : (
              <input
                type={field === "imageUrl" || field === "discordLink" || field === "redditLink" || field === "wikiLink" || field === "steamDBLink" || field === "purchaseLink" || field === "gogDreamlistLink" ? "url" : "text"}
                value={newValue}
                onChange={(e) => {
                  setNewValue(e.target.value);
                  // Clear error when user types
                  if (urlError) {
                    setUrlError("");
                    setError("");
                  }
                }}
                onBlur={() => {
                  const urlFields: CorrectionField[] = [
                    "imageUrl",
                    "discordLink",
                    "redditLink",
                    "wikiLink",
                    "steamDBLink",
                    "purchaseLink",
                    "gogDreamlistLink",
                  ];
                  if (urlFields.includes(field as CorrectionField) && newValue && !isValidUrl(newValue)) {
                    setUrlError(`${field} must be a valid URL`);
                    setError(`${field} must be a valid URL`);
                  }
                }}
                placeholder="Enter the corrected value..."
                className={`w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg border focus:border-[#107c10] focus:outline-none ${
                  urlError ? "border-red-500" : "border-gray-700"
                }`}
                required={["title", "status", "activationType"].includes(field || "")}
              />
            )}
            {urlError && (
              <p className="text-xs text-red-400 mt-1">{urlError}</p>
            )}
            {(field === "genres" || field === "platforms") && (
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple values with commas
              </p>
            )}
            {(field === "instructions" ||
              field === "knownIssues" ||
              field === "communityTips") && (
              <p className="text-xs text-gray-500 mt-1">
                Enter one item per line
              </p>
            )}
            {!["title", "status", "activationType"].includes(field || "") && (
              <p className="text-xs text-blue-400 mt-1">
                💡 Leave this field empty to clear/remove the current value
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Reason for Correction *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this correction is needed..."
              className="w-full p-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
              rows={3}
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Footer - Actions */}
          <div className="sticky bottom-0 bg-[#2d2d2d] border-t border-gray-700 pt-6 -mx-6 px-6 -mb-6 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                <FaTimes />
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                <FaCheck />
                {isSubmitting ? "Submitting..." : "Submit Correction"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

