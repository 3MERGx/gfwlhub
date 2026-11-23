"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  FaTimes,
  FaCheck,
  FaEdit,
  FaPlus,
  FaTrash,
  FaArrowLeft,
  FaSearch,
} from "react-icons/fa";
import { Game } from "@/data/games";
import { CorrectionField } from "@/types/crowdsource";
import UrlSafetyIndicator from "@/components/UrlSafetyIndicator";
import { getUrlValidationError } from "@/lib/url-validation";
import { useCSRF } from "@/hooks/useCSRF";
import {
  isNsfwDomainBlocked,
  isDirectDownloadLink,
} from "@/lib/nsfw-blacklist";
import {
  CORRECTION_FIELD_GROUPS,
  getFieldDisplayName,
} from "@/lib/field-display";

interface CorrectionModalProps {
  game: Game;
  onClose: () => void;
  onSubmit: () => void;
  userEmail: string;
  userName: string;
  userId?: string;
  initialField?: CorrectionField;
}

type ModalStep = "picker" | "editor" | "success";

export default function CorrectionModal({
  game,
  onClose,
  onSubmit,
  userEmail,
  userName,
  userId,
  initialField,
}: CorrectionModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { csrfToken } = useCSRF();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<ModalStep>(
    initialField ? "editor" : "picker"
  );
  const [field, setField] = useState<CorrectionField | "">(initialField || "");
  const [fieldSearch, setFieldSearch] = useState("");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [datePickerValue, setDatePickerValue] = useState<string>("");
  const [submittedRelatedFields, setSubmittedRelatedFields] = useState<
    string[]
  >([]);

  const [genres, setGenres] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [currentGenre, setCurrentGenre] = useState("");
  const [currentPlatform, setCurrentPlatform] = useState("");
  const [currentInstruction, setCurrentInstruction] = useState("");

  const [additionalDRMType, setAdditionalDRMType] = useState<string>("");
  const [additionalDRMCustom, setAdditionalDRMCustom] = useState<string>("");

  const [relatedCommunityAlternativeName, setRelatedCommunityAlternativeName] =
    useState<string>("");
  const [relatedRemasteredName, setRelatedRemasteredName] =
    useState<string>("");
  const [relatedRemasteredPlatform, setRelatedRemasteredPlatform] =
    useState<string>("");

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

    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const isValidUrl = (url: string): boolean => {
    if (!url || url.trim() === "") return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const checkUrlBlacklist = (
    url: string
  ): { isBlocked: boolean; reason?: string } => {
    if (!url || typeof url !== "string") {
      return { isBlocked: false };
    }

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      const nsfwCheck = isNsfwDomainBlocked(url);
      if (nsfwCheck.isBlocked) {
        return nsfwCheck;
      }

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

  const getFieldValue = useCallback(
    (fieldName: CorrectionField): string | string[] | undefined => {
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
        case "activationNotes":
          return game.activationNotes || "";
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
        case "communityAlternativeUrl":
          return game.communityAlternativeUrl || "";
        case "communityAlternativeDownloadLink":
          return game.communityAlternativeDownloadLink || "";
        case "remasteredName":
          return game.remasteredName || "";
        case "remasteredPlatform":
          return game.remasteredPlatform || "";
        default:
          return "";
      }
    },
    [game]
  );

  const formatCurrentValueDisplay = (
    fieldName: CorrectionField,
    value: string | string[] | undefined
  ): string | string[] => {
    if (fieldName === "isUnplayable") {
      return value === "true" ? "Yes" : "No";
    }
    return value ?? "";
  };

  const prefillField = useCallback(
    (selectedField: CorrectionField) => {
      setField(selectedField);
      setError("");
      setUrlError("");

      if (selectedField === "genres") {
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
        setNewValue("");
      } else if (selectedField === "platforms") {
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
        setNewValue("");
      } else if (selectedField === "instructions") {
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
        setNewValue("");
      } else if (selectedField === "additionalDRM") {
        const current = getFieldValue("additionalDRM");
        if (typeof current === "string" && current) {
          const predefinedOptions = [
            "Disc (SafeDisc/SecuROM/etc)",
            "Date check (SecuROM/ZDPP)",
            "Activation (SecuROM/custom)",
          ];
          if (predefinedOptions.includes(current)) {
            setAdditionalDRMType(current);
            setAdditionalDRMCustom("");
            setNewValue(current);
          } else {
            setAdditionalDRMType("Other");
            setAdditionalDRMCustom(current);
            setNewValue(current);
          }
        } else {
          setAdditionalDRMType("");
          setAdditionalDRMCustom("");
          setNewValue("");
        }
      } else if (selectedField === "releaseDate") {
        const currentDate = getFieldValue("releaseDate");
        if (currentDate && typeof currentDate === "string") {
          const parsed = new Date(currentDate);
          if (!isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, "0");
            const day = String(parsed.getDate()).padStart(2, "0");
            setDatePickerValue(`${year}-${month}-${day}`);
            setNewValue(formatDate(`${year}-${month}-${day}`));
          } else {
            setDatePickerValue("");
            setNewValue("");
          }
        } else {
          setDatePickerValue("");
          setNewValue("");
        }
      } else if (selectedField === "isUnplayable") {
        const currentValue = getFieldValue("isUnplayable");
        setNewValue(currentValue === "true" ? "true" : "false");
      } else if (
        selectedField === "description" ||
        selectedField === "knownIssues" ||
        selectedField === "communityTips" ||
        selectedField === "activationNotes" ||
        selectedField === "title" ||
        selectedField === "developer" ||
        selectedField === "publisher" ||
        selectedField === "activationType" ||
        selectedField === "status" ||
        selectedField === "playabilityStatus" ||
        selectedField === "imageUrl" ||
        selectedField === "discordLink" ||
        selectedField === "redditLink" ||
        selectedField === "wikiLink" ||
        selectedField === "steamDBLink" ||
        selectedField === "purchaseLink" ||
        selectedField === "gogDreamlistLink" ||
        selectedField === "communityAlternativeName" ||
        selectedField === "communityAlternativeUrl" ||
        selectedField === "communityAlternativeDownloadLink" ||
        selectedField === "remasteredName" ||
        selectedField === "remasteredPlatform"
      ) {
        const current = getFieldValue(selectedField);
        setNewValue(typeof current === "string" ? current : "");
        if (selectedField === "communityAlternativeDownloadLink") {
          const altName = getFieldValue("communityAlternativeName");
          setRelatedCommunityAlternativeName(
            typeof altName === "string" ? altName : ""
          );
        }
        if (selectedField === "playabilityStatus") {
          const status =
            typeof current === "string" ? current : "";
          if (status === "community_alternative") {
            const altName = getFieldValue("communityAlternativeName");
            setRelatedCommunityAlternativeName(
              typeof altName === "string" ? altName : ""
            );
          } else if (status === "remastered_available") {
            const remName = getFieldValue("remasteredName");
            const remPlatform = getFieldValue("remasteredPlatform");
            setRelatedRemasteredName(
              typeof remName === "string" ? remName : ""
            );
            setRelatedRemasteredPlatform(
              typeof remPlatform === "string" ? remPlatform : ""
            );
          }
        }
      } else {
        setNewValue("");
      }

      if (selectedField !== "playabilityStatus") {
        setRelatedCommunityAlternativeName("");
        setRelatedRemasteredName("");
        setRelatedRemasteredPlatform("");
      }
    },
    [getFieldValue]
  );

  useEffect(() => {
    if (initialField) {
      prefillField(initialField);
      setStep("editor");
    }
  }, [initialField, prefillField]);

  const isDirty = useMemo(() => {
    if (step === "success") return false;
    if (step === "picker") return fieldSearch.trim().length > 0;
    if (!field) return false;
    if (reason.trim()) return true;

    const current = getFieldValue(field as CorrectionField);
    if (field === "genres") {
      const currentArr = Array.isArray(current) ? current : [];
      return JSON.stringify(genres) !== JSON.stringify(currentArr);
    }
    if (field === "platforms") {
      const currentArr = Array.isArray(current) ? current : [];
      return JSON.stringify(platforms) !== JSON.stringify(currentArr);
    }
    if (field === "instructions") {
      const currentArr = Array.isArray(current) ? current : [];
      return JSON.stringify(instructions) !== JSON.stringify(currentArr);
    }
    if (field === "releaseDate") {
      const formatted = datePickerValue ? formatDate(datePickerValue) : "";
      return formatted !== (typeof current === "string" ? current : "");
    }
    if (field === "additionalDRM") {
      const drmValue =
        additionalDRMType === "Other"
          ? additionalDRMCustom.trim()
          : additionalDRMType;
      return drmValue !== (typeof current === "string" ? current : "");
    }
    if (field === "isUnplayable") {
      return newValue !== (current === "true" ? "true" : "false");
    }
    if (
      relatedCommunityAlternativeName.trim() ||
      relatedRemasteredName.trim() ||
      relatedRemasteredPlatform.trim()
    ) {
      return true;
    }
    return newValue !== (typeof current === "string" ? current : "");
  }, [
    step,
    field,
    fieldSearch,
    reason,
    genres,
    platforms,
    instructions,
    datePickerValue,
    additionalDRMType,
    additionalDRMCustom,
    newValue,
    relatedCommunityAlternativeName,
    relatedRemasteredName,
    relatedRemasteredPlatform,
    getFieldValue,
  ]);

  const requestClose = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Discard this correction?"
      );
      if (!confirmed) return;
    }
    onClose();
  }, [isDirty, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, [step]);

  const filteredGroups = useMemo(() => {
    const query = fieldSearch.trim().toLowerCase();
    if (!query) return CORRECTION_FIELD_GROUPS;

    return CORRECTION_FIELD_GROUPS.map((group) => ({
      ...group,
      fields: group.fields.filter((f) => {
        const label = getFieldDisplayName(f).toLowerCase();
        return label.includes(query) || f.toLowerCase().includes(query);
      }),
    })).filter((group) => group.fields.length > 0);
  }, [fieldSearch]);

  const relatedFieldsToSubmit = useMemo(() => {
    const extras: { field: CorrectionField; value: string }[] = [];
    if (field === "communityAlternativeDownloadLink") {
      const currentName = getFieldValue("communityAlternativeName");
      const existingName =
        typeof currentName === "string" ? currentName.trim() : "";
      const proposedName = relatedCommunityAlternativeName.trim();
      if (proposedName && proposedName !== existingName) {
        extras.push({
          field: "communityAlternativeName",
          value: proposedName,
        });
      }
      return extras;
    }
    if (field !== "playabilityStatus") return extras;
    if (newValue === "community_alternative") {
      const currentName = getFieldValue("communityAlternativeName");
      if (
        relatedCommunityAlternativeName.trim() &&
        relatedCommunityAlternativeName.trim() !==
          (typeof currentName === "string" ? currentName : "")
      ) {
        extras.push({
          field: "communityAlternativeName",
          value: relatedCommunityAlternativeName.trim(),
        });
      }
    }
    if (newValue === "remastered_available") {
      const currentName = getFieldValue("remasteredName");
      const currentPlatform = getFieldValue("remasteredPlatform");
      if (
        relatedRemasteredName.trim() &&
        relatedRemasteredName.trim() !==
          (typeof currentName === "string" ? currentName : "")
      ) {
        extras.push({
          field: "remasteredName",
          value: relatedRemasteredName.trim(),
        });
      }
      if (
        relatedRemasteredPlatform.trim() &&
        relatedRemasteredPlatform.trim() !==
          (typeof currentPlatform === "string" ? currentPlatform : "")
      ) {
        extras.push({
          field: "remasteredPlatform",
          value: relatedRemasteredPlatform.trim(),
        });
      }
    }
    return extras;
  }, [
    field,
    newValue,
    relatedCommunityAlternativeName,
    relatedRemasteredName,
    relatedRemasteredPlatform,
    getFieldValue,
  ]);

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

  const selectField = (selectedField: CorrectionField) => {
    prefillField(selectedField);
    setStep("editor");
  };

  const resetToPicker = () => {
    setStep("picker");
    setField("");
    setNewValue("");
    setReason("");
    setError("");
    setUrlError("");
    setFieldSearch("");
    setGenres([]);
    setPlatforms([]);
    setInstructions([]);
    setDatePickerValue("");
    setAdditionalDRMType("");
    setAdditionalDRMCustom("");
    setRelatedCommunityAlternativeName("");
    setRelatedRemasteredName("");
    setRelatedRemasteredPlatform("");
    setSubmittedRelatedFields([]);
  };

  const postCorrection = async (
    correctionField: CorrectionField,
    processedNewValue: string | string[] | boolean | null,
    correctionReason: string
  ) => {
    const response = await fetch("/api/corrections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken!,
      },
      body: JSON.stringify({
        gameId: game.id,
        gameSlug: game.slug,
        gameTitle: game.title,
        field: correctionField,
        oldValue: getFieldValue(correctionField),
        newValue: processedNewValue,
        reason: correctionReason,
        userEmail,
        userName,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to submit correction");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setError("");
    setUrlError("");

    if (!field) {
      setError("Please select a field to correct");
      return;
    }

    const urlFields: CorrectionField[] = [
      "imageUrl",
      "discordLink",
      "redditLink",
      "wikiLink",
      "steamDBLink",
      "purchaseLink",
      "gogDreamlistLink",
      "communityAlternativeUrl",
      "communityAlternativeDownloadLink",
    ];

    if (urlFields.includes(field as CorrectionField)) {
      if (newValue.trim()) {
        if (!isValidUrl(newValue.trim())) {
          setUrlError(`${getFieldDisplayName(field)} must be a valid URL`);
          setError(`${getFieldDisplayName(field)} must be a valid URL`);
          return;
        }

        const domainError = getUrlValidationError(field, newValue.trim());
        if (domainError) {
          setUrlError(domainError);
          setError(domainError);
          return;
        }

        const blacklistCheck = checkUrlBlacklist(newValue.trim());
        if (blacklistCheck.isBlocked) {
          setUrlError(blacklistCheck.reason || "This URL is not allowed");
          setError(blacklistCheck.reason || "This URL is not allowed");
          return;
        }

        if (field !== "communityAlternativeDownloadLink") {
          const downloadCheck = isDirectDownloadLink(newValue.trim());
          if (downloadCheck.isDirectDownload) {
            setUrlError(
              downloadCheck.reason ||
                "Direct download links are not allowed in this field"
            );
            setError(
              downloadCheck.reason ||
                "Direct download links are not allowed in this field"
            );
            return;
          }
        }
      }
    }

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
    }

    if (!reason.trim()) {
      setError("Please provide a reason for this correction");
      return;
    }

    if (
      field === "communityAlternativeDownloadLink" &&
      newValue.trim()
    ) {
      const currentName = getFieldValue("communityAlternativeName");
      const existingName =
        typeof currentName === "string" ? currentName.trim() : "";
      if (!existingName && !relatedCommunityAlternativeName.trim()) {
        setError(
          "Add a name for this community download so players can tell it apart from the original files."
        );
        return;
      }
    }

    setIsSubmitting(true);
    setError("");
    setUrlError("");

    try {
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
        processedNewValue =
          newValue === "true" ? true : newValue === "false" ? false : null;
      } else {
        processedNewValue = newValue.trim() || null;
      }

      if (!csrfToken) {
        setError("Security token not ready. Please wait...");
        setIsSubmitting(false);
        return;
      }

      const relatedLabels: string[] = [];
      const relatedReasonSuffix =
        field === "communityAlternativeDownloadLink"
          ? " (related to community download)"
          : " (related to playability status)";

      // Submit companion name first so the download correction can require it.
      for (const related of relatedFieldsToSubmit) {
        await postCorrection(
          related.field,
          related.value,
          `${reason.trim()}${relatedReasonSuffix}`
        );
        relatedLabels.push(getFieldDisplayName(related.field));
      }

      await postCorrection(
        field as CorrectionField,
        processedNewValue,
        reason.trim()
      );

      setSubmittedRelatedFields(relatedLabels);
      onSubmit();
      setStep("success");

      // Only refresh the submissions dashboard. Game pages do not change until
      // a correction is approved, and refreshing here remounts this modal and
      // wipes the success step (leaving the form open).
      if (pathname === "/dashboard/submissions") {
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit correction"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentValue = field ? getFieldValue(field as CorrectionField) : "";
  const displayCurrentValue = field
    ? formatCurrentValueDisplay(field as CorrectionField, currentValue)
    : "";

  const handleBackdropClick = () => {
    if (isDirty) {
      requestClose();
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="correction-modal-title"
        tabIndex={-1}
        className="bg-[rgb(var(--bg-card))] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[rgb(var(--bg-card))] border-b border-[rgb(var(--border-color))] p-6 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2
                id="correction-modal-title"
                className="text-xl font-bold text-[rgb(var(--text-primary))] mb-1 flex items-center gap-2"
              >
                <FaEdit />
                Suggest a correction
              </h2>
              <p className="text-[rgb(var(--text-secondary))] text-sm">
                {game.title}
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] text-2xl"
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {step === "success" ? (
          <div className="p-6 space-y-6">
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-300 text-sm font-semibold mb-1">
                Correction submitted
              </p>
              <p className="text-[rgb(var(--text-secondary))] text-sm">
                A reviewer will check it before the page updates.
                {submittedRelatedFields.length > 0 && (
                  <>
                    {" "}
                    Also submitted: {submittedRelatedFields.join(", ")}.
                  </>
                )}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={resetToPicker}
                className="px-4 py-3 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FaPlus />
                Submit another field
              </button>
              {userId ? (
                <Link
                  href={`/profile/${userId}`}
                  className="px-4 py-3 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors flex items-center justify-center gap-2 border border-[rgb(var(--border-color))]"
                  onClick={onClose}
                >
                  View on your profile
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors border border-[rgb(var(--border-color))]"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        ) : step === "picker" ? (
          <div className="p-6 space-y-4">
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              Choose one field to correct. Each suggestion is reviewed before it
              goes live. You can submit another field after this one.
            </p>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
              <input
                type="search"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder="Search fields..."
                className="w-full pl-10 pr-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
                aria-label="Search fields"
              />
            </div>
            <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
              {filteredGroups.length === 0 ? (
                <p className="text-sm text-[rgb(var(--text-muted))] text-center py-6">
                  No fields match your search.
                </p>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.id}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))] mb-2">
                      {group.label}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.fields.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => selectField(f)}
                          className="text-left px-3 py-2.5 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] hover:border-[#107c10] hover:bg-[#107c10]/10 text-[rgb(var(--text-primary))] text-sm transition-colors"
                        >
                          {getFieldDisplayName(f)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={requestClose}
                className="w-full px-4 py-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors border border-[rgb(var(--border-color))]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-300 text-sm font-semibold">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs text-[rgb(var(--text-muted))] mb-1">
                  Field to correct
                </p>
                <p className="text-[rgb(var(--text-primary))] font-medium">
                  {field ? getFieldDisplayName(field) : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isDirty) {
                    const confirmed = window.confirm(
                      "Discard edits and choose a different field?"
                    );
                    if (!confirmed) return;
                  }
                  resetToPicker();
                }}
                className="inline-flex items-center gap-2 text-sm text-[#107c10] hover:underline"
              >
                <FaArrowLeft size={12} />
                Change field
              </button>
            </div>

            {field && (
              <div>
                <label className="text-sm text-[rgb(var(--text-secondary))] mb-2 block">
                  Current value
                </label>
                <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3 border border-[rgb(var(--border-color))]">
                  {Array.isArray(displayCurrentValue) ? (
                    <div className="flex flex-wrap gap-2">
                      {displayCurrentValue.length > 0 ? (
                        displayCurrentValue.map((item, index) => (
                          <span
                            key={index}
                            className="bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] rounded px-2.5 py-1 text-[rgb(var(--text-primary))] text-xs"
                          >
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-[rgb(var(--text-secondary))] text-sm">
                          N/A
                        </span>
                      )}
                    </div>
                  ) : (
                    <pre className="text-[rgb(var(--text-secondary))] text-sm whitespace-pre-wrap break-all">
                      {displayCurrentValue || "N/A"}
                    </pre>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm text-[rgb(var(--text-secondary))] block">
                  New value
                  {!["title", "status", "activationType"].includes(field || "")
                    ? ""
                    : " *"}
                </label>
                {(field === "imageUrl" ||
                  field === "communityAlternativeUrl" ||
                  field === "communityAlternativeDownloadLink") &&
                  newValue && <UrlSafetyIndicator url={newValue} />}
              </div>
              {field === "genres" ? (
                <div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentGenre}
                      onChange={(e) => setCurrentGenre(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddItem("genres", currentGenre, setCurrentGenre);
                        }
                      }}
                      className="flex-1 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
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
                          className="bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] rounded px-2.5 py-1 flex items-center gap-1.5"
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
              ) : field === "platforms" ? (
                <div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentPlatform}
                      onChange={(e) => setCurrentPlatform(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddItem(
                            "platforms",
                            currentPlatform,
                            setCurrentPlatform
                          );
                        }
                      }}
                      className="flex-1 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
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
                          className="bg-[rgb(var(--bg-card-alt))] border border-[rgb(var(--border-color))] rounded px-2.5 py-1 flex items-center gap-1.5"
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
              ) : field === "instructions" ? (
                <div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentInstruction}
                      onChange={(e) => setCurrentInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddItem(
                            "instructions",
                            currentInstruction,
                            setCurrentInstruction
                          );
                        }
                      }}
                      className="flex-1 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
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
                          className="bg-[rgb(var(--bg-card))] rounded-lg px-4 py-2 flex items-center justify-between"
                        >
                          <span className="text-[rgb(var(--text-primary))] text-sm">
                            {index + 1}. {instruction}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveItem("instructions", index)
                            }
                            className="text-red-400 hover:text-red-300 transition-colors"
                            aria-label={`Remove step ${index + 1}`}
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
                field === "communityTips" ||
                field === "activationNotes" ? (
                <textarea
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={
                    !["title", "status", "activationType"].includes(field || "")
                      ? "Edit the value (or clear to remove)..."
                      : "Enter the corrected value..."
                  }
                  className="w-full p-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
                  rows={6}
                  required={["title", "status", "activationType"].includes(
                    field || ""
                  )}
                />
              ) : field === "activationType" ? (
                <select
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="select-chevron w-full px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
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
                  className="select-chevron w-full px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
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
                    className="select-chevron w-full px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
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
                      className="w-full px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
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
                      if (selectedStatus === "community_alternative") {
                        const currentAltName = getFieldValue(
                          "communityAlternativeName"
                        );
                        setRelatedCommunityAlternativeName(
                          typeof currentAltName === "string"
                            ? currentAltName
                            : ""
                        );
                        setRelatedRemasteredName("");
                        setRelatedRemasteredPlatform("");
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
                        setRelatedCommunityAlternativeName("");
                      } else {
                        setRelatedCommunityAlternativeName("");
                        setRelatedRemasteredName("");
                        setRelatedRemasteredPlatform("");
                      }
                    }}
                    className="select-chevron w-full px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
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

                  {newValue === "community_alternative" && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
                        Community Alternative Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={relatedCommunityAlternativeName}
                        onChange={(e) =>
                          setRelatedCommunityAlternativeName(e.target.value)
                        }
                        placeholder="e.g., Project Name"
                        className="w-full px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
                      />
                    </div>
                  )}

                  {newValue === "remastered_available" && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
                          Remastered Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={relatedRemasteredName}
                          onChange={(e) =>
                            setRelatedRemasteredName(e.target.value)
                          }
                          placeholder="e.g., Remastered Name"
                          className="w-full px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
                          Remastered Platform (Optional)
                        </label>
                        <input
                          type="text"
                          value={relatedRemasteredPlatform}
                          onChange={(e) =>
                            setRelatedRemasteredPlatform(e.target.value)
                          }
                          placeholder="e.g., Platform Name"
                          className="w-full px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {relatedFieldsToSubmit.length > 0 && (
                    <div className="bg-[#107c10]/10 border border-[#107c10]/30 rounded-lg p-3">
                      <p className="text-xs text-[rgb(var(--text-primary))] font-medium mb-1">
                        Also submitting:
                      </p>
                      <ul className="text-xs text-[rgb(var(--text-secondary))] list-disc list-inside">
                        {relatedFieldsToSubmit.map((r) => (
                          <li key={r.field}>{getFieldDisplayName(r.field)}</li>
                        ))}
                      </ul>
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
                    className="w-4 h-4 text-[#107c10] bg-[rgb(var(--bg-card-alt))] border-[rgb(var(--border-color))] rounded focus:ring-[#107c10] focus:ring-2"
                  />
                  <label
                    htmlFor="isUnplayable"
                    className="ml-2 text-sm font-medium text-[rgb(var(--text-primary))]"
                  >
                    Original game is unplayable
                  </label>
                </div>
              ) : field === "communityAlternativeName" ||
                field === "remasteredName" ||
                field === "remasteredPlatform" ||
                field === "communityAlternativeUrl" ||
                field === "communityAlternativeDownloadLink" ? (
                <div className="space-y-2">
                  {field === "communityAlternativeDownloadLink" && (
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
                        Community alternative name
                        {!(
                          typeof getFieldValue("communityAlternativeName") ===
                            "string" &&
                          String(
                            getFieldValue("communityAlternativeName")
                          ).trim()
                        )
                          ? " (required)"
                          : " (optional if already set)"}
                      </label>
                      <input
                        type="text"
                        value={relatedCommunityAlternativeName}
                        onChange={(e) =>
                          setRelatedCommunityAlternativeName(e.target.value)
                        }
                        placeholder="e.g., Shadowrun 1.5 Community Launcher"
                        className="w-full px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none mb-3"
                      />
                    </div>
                  )}
                  <input
                    type={
                      field === "communityAlternativeUrl" ||
                      field === "communityAlternativeDownloadLink"
                        ? "url"
                        : "text"
                    }
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={
                      field === "communityAlternativeName"
                        ? "e.g., Project Name"
                        : field === "communityAlternativeUrl"
                          ? "https://example.com"
                          : field === "communityAlternativeDownloadLink"
                            ? "https://example.com/download"
                            : field === "remasteredName"
                              ? "e.g., Remastered Name"
                              : "e.g., Platform Name"
                    }
                    className="w-full px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
                  />
                  {newValue.trim() && (
                    <>
                      {field === "communityAlternativeName" &&
                        game.playabilityStatus !== "community_alternative" && (
                          <p className="text-xs text-yellow-400">
                            Note: Consider also correcting the playability
                            status to &quot;Community Alternative&quot;
                          </p>
                        )}
                      {field === "remasteredName" &&
                        game.playabilityStatus !== "remastered_available" && (
                          <p className="text-xs text-yellow-400">
                            Note: Consider also correcting the playability
                            status to &quot;Remastered Available&quot;
                          </p>
                        )}
                    </>
                  )}
                  {field === "communityAlternativeDownloadLink" &&
                    relatedFieldsToSubmit.length > 0 && (
                      <div className="bg-[#107c10]/10 border border-[#107c10]/30 rounded-lg p-3">
                        <p className="text-xs text-[rgb(var(--text-primary))] font-medium mb-1">
                          Also submitting:
                        </p>
                        <ul className="text-xs text-[rgb(var(--text-secondary))] list-disc list-inside">
                          {relatedFieldsToSubmit.map((r) => (
                            <li key={r.field}>
                              {getFieldDisplayName(r.field)}
                            </li>
                          ))}
                        </ul>
                      </div>
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
                    className="w-full px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
                    min="1900-01-01"
                    max={new Date().toISOString().split("T")[0]}
                  />
                  {newValue && (
                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">
                      Selected: {newValue}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
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
                      if (urlError) {
                        setUrlError("");
                        setError("");
                      }
                    }}
                    onBlur={() => {
                      const blurUrlFields: CorrectionField[] = [
                        "imageUrl",
                        "discordLink",
                        "redditLink",
                        "wikiLink",
                        "steamDBLink",
                        "purchaseLink",
                        "gogDreamlistLink",
                        "communityAlternativeUrl",
                        "communityAlternativeDownloadLink",
                      ];
                      if (
                        blurUrlFields.includes(field as CorrectionField) &&
                        newValue &&
                        newValue.trim()
                      ) {
                        if (!isValidUrl(newValue.trim())) {
                          setUrlError(
                            `${getFieldDisplayName(field)} must be a valid URL`
                          );
                          setError(
                            `${getFieldDisplayName(field)} must be a valid URL`
                          );
                        } else {
                          const domainError = getUrlValidationError(
                            field,
                            newValue.trim()
                          );
                          if (domainError) {
                            setUrlError(domainError);
                            setError(domainError);
                          } else if (urlError) {
                            setUrlError("");
                            setError("");
                          }
                        }
                      }
                    }}
                    placeholder="Enter the corrected value..."
                    className={`w-full px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border focus:border-[#107c10] focus:outline-none ${
                      urlError
                        ? "border-red-500"
                        : "border-[rgb(var(--border-color))]"
                    }`}
                    required={["title", "status", "activationType"].includes(
                      field || ""
                    )}
                  />
                </div>
              )}
              {urlError && (
                <p className="text-xs text-red-400 mt-1">{urlError}</p>
              )}
              {(field === "knownIssues" || field === "communityTips") && (
                <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
                  Enter one item per line
                </p>
              )}
              {field === "activationNotes" && (
                <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
                  Optional note shown under the badges. Leave empty if this
                  title needs no extra activation guidance.
                </p>
              )}
              {field === "imageUrl" && (
                <p className="text-xs text-[rgb(var(--text-muted))] mt-1.5">
                  Use a direct image URL (ending in .jpg, .png, etc.) from a
                  reliable source like Wikipedia or official game websites.
                </p>
              )}
              {![
                "title",
                "status",
                "activationType",
                "genres",
                "platforms",
                "instructions",
                "imageUrl",
                "isUnplayable",
              ].includes(field || "") && (
                <p className="text-xs text-blue-400 mt-1">
                  Leave this field empty to clear/remove the current value
                </p>
              )}
              {["genres", "platforms", "instructions"].includes(
                field || ""
              ) && (
                <p className="text-xs text-blue-400 mt-1">
                  Remove all items to clear/remove the current value
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-[rgb(var(--text-secondary))] mb-2 block">
                Reason for correction *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this correction is needed..."
                className="w-full p-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
                rows={3}
                required
              />
            </div>

            <div className="sticky bottom-0 bg-[rgb(var(--bg-card))] border-t border-[rgb(var(--border-color))] pt-6 -mx-6 px-6 -mb-6 pb-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={requestClose}
                  className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors flex items-center justify-center gap-2 border border-[rgb(var(--border-color))]"
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
                  {isSubmitting ? "Submitting..." : "Submit correction"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
