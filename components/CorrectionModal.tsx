"use client";

import { useState, useEffect } from "react";
import { FaTimes, FaCheck, FaEdit, FaPlus, FaTrash } from "react-icons/fa";
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

  // Array field states for tag-based inputs
  const [genres, setGenres] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [currentGenre, setCurrentGenre] = useState("");
  const [currentPlatform, setCurrentPlatform] = useState("");
  const [currentInstruction, setCurrentInstruction] = useState("");

  // Additional DRM state
  const [additionalDRMType, setAdditionalDRMType] = useState<string>("");
  const [additionalDRMCustom, setAdditionalDRMCustom] = useState<string>("");

  // Related playability fields (shown conditionally when playabilityStatus is selected)
  const [relatedCommunityAlternativeName, setRelatedCommunityAlternativeName] =
    useState<string>("");
  const [relatedRemasteredName, setRelatedRemasteredName] =
    useState<string>("");
  const [relatedRemasteredPlatform, setRelatedRemasteredPlatform] =
    useState<string>("");

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

  // Initialize array fields when genres/platforms/instructions field is selected
  useEffect(() => {
    if (field === "genres") {
      const current = getFieldValue("genres");
      if (Array.isArray(current)) {
        setGenres(current);
      } else if (typeof current === "string" && current) {
        setGenres(
          current
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v)
        );
      } else {
        setGenres([]);
      }
      setCurrentGenre("");
    } else if (field === "platforms") {
      const current = getFieldValue("platforms");
      if (Array.isArray(current)) {
        setPlatforms(current);
      } else if (typeof current === "string" && current) {
        setPlatforms(
          current
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v)
        );
      } else {
        setPlatforms([]);
      }
      setCurrentPlatform("");
    } else if (field === "instructions") {
      const current = getFieldValue("instructions");
      if (Array.isArray(current)) {
        setInstructions(current);
      } else if (typeof current === "string" && current) {
        setInstructions(
          current
            .split("\n")
            .map((v) => v.trim())
            .filter((v) => v)
        );
      } else {
        setInstructions([]);
      }
      setCurrentInstruction("");
    } else if (field === "additionalDRM") {
      const current = getFieldValue("additionalDRM");
      if (typeof current === "string" && current) {
        // Check if it matches one of the predefined options
        const predefinedOptions = [
          "Disc (SafeDisc/SecuROM/etc)",
          "Date check (SecuROM/ZDPP)",
          "Activation (SecuROM/custom)",
        ];
        if (predefinedOptions.includes(current)) {
          setAdditionalDRMType(current);
          setAdditionalDRMCustom("");
        } else {
          setAdditionalDRMType("Other");
          setAdditionalDRMCustom(current);
        }
      } else {
        setAdditionalDRMType("");
        setAdditionalDRMCustom("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field]);

  // Map of fields to their current values
  const getFieldValue = (
    fieldName: CorrectionField
  ): string | string[] | undefined => {
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
        return game.genres || [];
      case "platforms":
        return game.platforms || [];
      case "activationType":
        return game.activationType;
      case "status":
        return game.status;
      case "instructions":
        return game.instructions || [];
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
      case "additionalDRM":
        return game.additionalDRM || "";
      case "playabilityStatus":
        return game.playabilityStatus || "";
      case "isUnplayable":
        return game.isUnplayable ? "true" : "false";
      case "communityAlternativeName":
        return game.communityAlternativeName || "";
      case "remasteredName":
        return game.remasteredName || "";
      case "remasteredPlatform":
        return game.remasteredPlatform || "";
      default:
        return "";
    }
  };

  // Helper to handle adding items to array fields
  const handleAddItem = (
    fieldType: "genres" | "platforms" | "instructions",
    value: string,
    setter: (val: string) => void
  ) => {
    if (value.trim()) {
      if (fieldType === "genres") {
        setGenres([...genres, value.trim()]);
      } else if (fieldType === "platforms") {
        setPlatforms([...platforms, value.trim()]);
      } else if (fieldType === "instructions") {
        setInstructions([...instructions, value.trim()]);
      }
      setter("");
    }
  };

  // Helper to handle removing items from array fields
  const handleRemoveItem = (
    fieldType: "genres" | "platforms" | "instructions",
    index: number
  ) => {
    if (fieldType === "genres") {
      setGenres(genres.filter((_, i) => i !== index));
    } else if (fieldType === "platforms") {
      setPlatforms(platforms.filter((_, i) => i !== index));
    } else if (fieldType === "instructions") {
      setInstructions(instructions.filter((_, i) => i !== index));
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
    const requiredFields: CorrectionField[] = [
      "title",
      "status",
      "activationType",
    ];
    if (requiredFields.includes(field as CorrectionField)) {
      if (
        !newValue.trim() &&
        field !== "releaseDate" &&
        field !== "genres" &&
        field !== "platforms" &&
        field !== "instructions"
      ) {
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
      } else if (
        field === "genres" ||
        field === "platforms" ||
        field === "instructions"
      ) {
        // Array fields are handled separately - empty arrays are allowed to clear
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
      let processedNewValue: string | string[] | boolean | null;
      if (field === "releaseDate") {
        processedNewValue = datePickerValue
          ? formatDate(datePickerValue)
          : null;
      } else if (field === "genres") {
        processedNewValue = genres.length > 0 ? genres : null;
      } else if (field === "platforms") {
        processedNewValue = platforms.length > 0 ? platforms : null;
      } else if (field === "instructions") {
        processedNewValue = instructions.length > 0 ? instructions : null;
      } else if (field === "additionalDRM") {
        if (additionalDRMType === "Other") {
          processedNewValue = additionalDRMCustom.trim() || null;
        } else if (additionalDRMType) {
          processedNewValue = additionalDRMType;
        } else {
          processedNewValue = null;
        }
      } else if (field === "knownIssues" || field === "communityTips") {
        processedNewValue = newValue.trim()
          ? newValue
              .split("\n")
              .map((v) => v.trim())
              .filter((v) => v)
          : null;
      } else if (field === "isUnplayable") {
        // Convert "true"/"false" strings to boolean
        processedNewValue =
          newValue === "true" ? true : newValue === "false" ? false : null;
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
      setError(
        err instanceof Error ? err.message : "Failed to submit correction"
      );
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
                const selectedField = e.target.value as CorrectionField;
                setField(selectedField);
                // Initialize newValue based on field type
                if (selectedField === "isUnplayable") {
                  const currentValue = getFieldValue("isUnplayable");
                  setNewValue(currentValue === "true" ? "true" : "false");
                } else {
                  setNewValue("");
                }
                // Reset related fields when field changes
                setRelatedCommunityAlternativeName("");
                setRelatedRemasteredName("");
                setRelatedRemasteredPlatform("");
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
              <option value="genres">Genres</option>
              <option value="platforms">Platforms</option>
              <option value="additionalDRM">Additional DRM</option>
              <option value="activationType">Activation Type</option>
              <option value="status">Status</option>
              <option value="imageUrl">Box Art / Cover Image URL</option>
              <option value="instructions">Instructions</option>
              <option value="knownIssues">Known Issues (one per line)</option>
              <option value="communityTips">
                Community Tips (one per line)
              </option>
              <option value="discordLink">Discord Link</option>
              <option value="redditLink">Reddit Link</option>
              <option value="wikiLink">Wiki Link</option>
              <option value="steamDBLink">SteamDB Link</option>
              <option value="purchaseLink">Purchase Link</option>
              <option value="gogDreamlistLink">GOG Dreamlist Link</option>
              <option value="playabilityStatus">Playability Status</option>
              <option value="isUnplayable">Is Unplayable</option>
              <option value="communityAlternativeName">
                Community Alternative Name
              </option>
              <option value="remasteredName">Remastered Name</option>
              <option value="remasteredPlatform">Remastered Platform</option>
            </select>
          </div>

          {/* Current Value */}
          {field && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Current Value
              </label>
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-700">
                {Array.isArray(currentValue) ? (
                  <div className="flex flex-wrap gap-2">
                    {currentValue.length > 0 ? (
                      currentValue.map((item, index) => (
                        <span
                          key={index}
                          className="bg-[#2d2d2d] border border-gray-600 rounded px-2.5 py-1 text-white text-xs"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm">N/A</span>
                    )}
                  </div>
                ) : (
                  <pre className="text-gray-400 text-sm whitespace-pre-wrap break-all">
                    {currentValue || "N/A"}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* New Value */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              New Value{" "}
              {!["title", "status", "activationType"].includes(field || "")
                ? "(leave empty to clear)"
                : "*"}
            </label>
            {field === "genres" ? (
              <div>
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
                    className="flex-1 bg-[#1a1a1a] text-white rounded-lg px-4 py-2 border border-gray-700 focus:border-[#107c10] focus:outline-none"
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
                {genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {genres.map((genre, index) => (
                      <div
                        key={index}
                        className="bg-[#2d2d2d] border border-gray-600 rounded px-2.5 py-1 flex items-center gap-1.5"
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
            ) : field === "platforms" ? (
              <div>
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
                    className="flex-1 bg-[#1a1a1a] text-white rounded-lg px-4 py-2 border border-gray-700 focus:border-[#107c10] focus:outline-none"
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
                {platforms.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((platform, index) => (
                      <div
                        key={index}
                        className="bg-[#2d2d2d] border border-gray-600 rounded px-2.5 py-1 flex items-center gap-1.5"
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
            ) : field === "instructions" ? (
              <div>
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
                    className="flex-1 bg-[#1a1a1a] text-white rounded-lg px-4 py-2 border border-gray-700 focus:border-[#107c10] focus:outline-none"
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
                {instructions.length > 0 && (
                  <ul className="space-y-2">
                    {instructions.map((instruction, index) => (
                      <li
                        key={index}
                        className="bg-[#2d2d2d] rounded-lg px-4 py-2 flex items-center justify-between"
                      >
                        <span className="text-white text-sm">
                          {index + 1}. {instruction}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveItem("instructions", index)
                          }
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <FaTrash size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : field === "description" ||
              field === "knownIssues" ||
              field === "communityTips" ? (
              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={
                  !["title", "status", "activationType"].includes(field || "")
                    ? "Enter the corrected value (or leave empty to clear)..."
                    : "Enter the corrected value..."
                }
                className="w-full p-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
                rows={6}
                required={["title", "status", "activationType"].includes(
                  field || ""
                )}
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
            ) : field === "additionalDRM" ? (
              <div className="space-y-3">
                <select
                  value={additionalDRMType}
                  onChange={(e) => {
                    setAdditionalDRMType(e.target.value);
                    if (e.target.value === "Other") {
                      setNewValue(additionalDRMCustom);
                    } else if (e.target.value) {
                      setNewValue(e.target.value);
                    } else {
                      setNewValue("");
                    }
                  }}
                  className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
                >
                  <option value="">Select DRM type...</option>
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
                {additionalDRMType === "Other" && (
                  <input
                    type="text"
                    value={additionalDRMCustom}
                    onChange={(e) => {
                      setAdditionalDRMCustom(e.target.value);
                      setNewValue(e.target.value);
                    }}
                    placeholder="Enter custom DRM..."
                    className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
                  />
                )}
              </div>
            ) : field === "playabilityStatus" ? (
              <div className="space-y-4">
                <select
                  value={newValue}
                  onChange={(e) => {
                    const selectedStatus = e.target.value;
                    setNewValue(selectedStatus);
                    // Initialize related fields with current values when status is selected
                    if (selectedStatus === "community_alternative") {
                      const currentAltName = getFieldValue(
                        "communityAlternativeName"
                      );
                      setRelatedCommunityAlternativeName(
                        typeof currentAltName === "string" ? currentAltName : ""
                      );
                    } else if (selectedStatus === "remastered_available") {
                      const currentRemasteredName =
                        getFieldValue("remasteredName");
                      const currentRemasteredPlatform =
                        getFieldValue("remasteredPlatform");
                      setRelatedRemasteredName(
                        typeof currentRemasteredName === "string"
                          ? currentRemasteredName
                          : ""
                      );
                      setRelatedRemasteredPlatform(
                        typeof currentRemasteredPlatform === "string"
                          ? currentRemasteredPlatform
                          : ""
                      );
                    } else {
                      // Clear related fields if status changes away from these options
                      setRelatedCommunityAlternativeName("");
                      setRelatedRemasteredName("");
                      setRelatedRemasteredPlatform("");
                    }
                    // Auto-update isUnplayable if status changes
                    if (selectedStatus === "unplayable") {
                      // If changing to unplayable, suggest checking isUnplayable
                      // (but don't auto-set it, let user decide)
                    } else if (selectedStatus === "playable") {
                      // If changing to playable, suggest unchecking isUnplayable
                      // (but don't auto-set it, let user decide)
                    }
                  }}
                  className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
                >
                  <option value="">Select playability status...</option>
                  <option value="playable">Playable</option>
                  <option value="unplayable">Unplayable</option>
                  <option value="community_alternative">
                    Community Alternative
                  </option>
                  <option value="remastered_available">
                    Remastered Available
                  </option>
                </select>

                {/* Conditionally show related fields */}
                {newValue === "community_alternative" && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Community Alternative Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={relatedCommunityAlternativeName}
                      onChange={(e) =>
                        setRelatedCommunityAlternativeName(e.target.value)
                      }
                      placeholder="e.g., Project Name"
                      className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
                    />
                  </div>
                )}

                {newValue === "remastered_available" && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Remastered Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={relatedRemasteredName}
                        onChange={(e) =>
                          setRelatedRemasteredName(e.target.value)
                        }
                        placeholder="e.g., Remastered Name"
                        className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Remastered Platform (Optional)
                      </label>
                      <input
                        type="text"
                        value={relatedRemasteredPlatform}
                        onChange={(e) =>
                          setRelatedRemasteredPlatform(e.target.value)
                        }
                        placeholder="e.g., Platform Name"
                        className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : field === "isUnplayable" ? (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isUnplayable"
                  checked={newValue === "true"}
                  onChange={(e) =>
                    setNewValue(e.target.checked ? "true" : "false")
                  }
                  className="w-4 h-4 text-[#107c10] bg-[#1a1a1a] border-gray-600 rounded focus:ring-[#107c10] focus:ring-2"
                />
                <label
                  htmlFor="isUnplayable"
                  className="ml-2 text-sm font-medium text-gray-300"
                >
                  Original game is unplayable
                </label>
              </div>
            ) : field === "communityAlternativeName" ||
              field === "remasteredName" ||
              field === "remasteredPlatform" ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => {
                    setNewValue(e.target.value);
                    // Show warning if field is filled but playabilityStatus doesn't match
                    if (e.target.value.trim()) {
                      if (
                        field === "communityAlternativeName" &&
                        game.playabilityStatus !== "community_alternative"
                      ) {
                        // Warning will be shown below
                      } else if (
                        field === "remasteredName" &&
                        game.playabilityStatus !== "remastered_available"
                      ) {
                        // Warning will be shown below
                      }
                    }
                  }}
                  placeholder={
                    field === "communityAlternativeName"
                      ? "e.g., Project Name"
                      : field === "remasteredName"
                      ? "e.g., Remastered Name"
                      : "e.g., Platform Name"
                  }
                  className="w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
                />
                {newValue.trim() && (
                  <>
                    {field === "communityAlternativeName" &&
                      game.playabilityStatus !== "community_alternative" && (
                        <p className="text-xs text-yellow-400">
                          ⚠️ Note: Consider also correcting the playability
                          status to &quot;Community Alternative&quot;
                        </p>
                      )}
                    {field === "remasteredName" &&
                      game.playabilityStatus !== "remastered_available" && (
                        <p className="text-xs text-yellow-400">
                          ⚠️ Note: Consider also correcting the playability
                          status to &quot;Remastered Available&quot;
                        </p>
                      )}
                  </>
                )}
              </div>
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
                type={
                  field === "imageUrl" ||
                  field === "discordLink" ||
                  field === "redditLink" ||
                  field === "wikiLink" ||
                  field === "steamDBLink" ||
                  field === "purchaseLink" ||
                  field === "gogDreamlistLink"
                    ? "url"
                    : "text"
                }
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
                  if (
                    urlFields.includes(field as CorrectionField) &&
                    newValue &&
                    !isValidUrl(newValue)
                  ) {
                    setUrlError(`${field} must be a valid URL`);
                    setError(`${field} must be a valid URL`);
                  }
                }}
                placeholder="Enter the corrected value..."
                className={`w-full px-4 py-3 bg-[#1a1a1a] text-white rounded-lg border focus:border-[#107c10] focus:outline-none ${
                  urlError ? "border-red-500" : "border-gray-700"
                }`}
                required={["title", "status", "activationType"].includes(
                  field || ""
                )}
              />
            )}
            {urlError && (
              <p className="text-xs text-red-400 mt-1">{urlError}</p>
            )}
            {(field === "knownIssues" || field === "communityTips") && (
              <p className="text-xs text-gray-500 mt-1">
                Enter one item per line
              </p>
            )}
            {![
              "title",
              "status",
              "activationType",
              "genres",
              "platforms",
              "instructions",
            ].includes(field || "") && (
              <p className="text-xs text-blue-400 mt-1">
                💡 Leave this field empty to clear/remove the current value
              </p>
            )}
            {["genres", "platforms", "instructions"].includes(field || "") && (
              <p className="text-xs text-blue-400 mt-1">
                💡 Remove all items to clear/remove the current value
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
