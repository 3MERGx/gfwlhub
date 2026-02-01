"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaTimesCircle,
  FaCheckCircle,
  FaClock,
  FaArrowLeft,
  FaExclamationTriangle,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { useToast } from "@/components/ui/toast-context";
import { useCSRF } from "@/hooks/useCSRF";
import { REVIEWER_APPLICATION_CONFIG } from "@/lib/reviewer-application-config";
import { FaTimes } from "react-icons/fa";
import { filterLanguages } from "@/lib/languages";
import {
  LoadingSkeleton,
  CardSkeleton,
} from "@/components/ui/loading-skeleton";
import { FaExternalLinkAlt } from "react-icons/fa";

interface EligibilityDetails {
  eligible: boolean;
  accountAgeDays: number;
  submissionsCount: number;
  approvedCount: number;
  rejectedCount: number;
  approvalRate: number;
  missingRequirements: string[];
}

interface ReviewerApplication {
  id: string;
  status: "pending" | "approved" | "rejected";
  motivationText: string;
  experienceText: string;
  contributionExamples: string;
  timeAvailability?: string;
  languages?: string;
  priorExperience?: string;
  agreedToRules: boolean;
  createdAt: Date;
  decisionAt?: Date;
  adminNotes?: string;
}

export default function BecomeReviewerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const { csrfToken } = useCSRF();

  const [eligibility, setEligibility] = useState<EligibilityDetails | null>(
    null
  );
  const [application, setApplication] = useState<ReviewerApplication | null>(
    null
  );
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");
  const [contributionExamples, setContributionExamples] = useState("");
  const [timeAvailability, setTimeAvailability] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");
  const [showLanguageSuggestions, setShowLanguageSuggestions] = useState(false);
  const [priorExperience, setPriorExperience] = useState("");
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    motivation?: string;
    experience?: string;
    contributionExamples?: string;
  }>({});
  const [reapplyInfo, setReapplyInfo] = useState<{
    canReapply: boolean;
    daysUntilReapply?: number;
  } | null>(null);
  const [applicationHistory, setApplicationHistory] = useState<
    ReviewerApplication[]
  >([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/become-reviewer");
      return;
    }

    if (status === "authenticated" && session) {
      // Check if user is already a reviewer or admin
      if (session.user.role !== "user") {
        router.push("/");
        return;
      }

      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [eligibilityRes, applicationRes, historyRes] = await Promise.all([
        fetch("/api/reviewer-application/eligibility"),
        fetch("/api/reviewer-application"),
        fetch("/api/reviewer-application/history"),
      ]);

      if (eligibilityRes.ok) {
        const eligibilityData = await eligibilityRes.json();
        setEligibility(eligibilityData);
      }

      if (applicationRes.ok) {
        const applicationData = await applicationRes.json();
        setApplication(applicationData.application || null);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setApplicationHistory(historyData.history || []);
        // Check reapply info from the most recent rejection
        const lastRejected = historyData.history?.find(
          (app: ReviewerApplication) => app.status === "rejected"
        );
        if (lastRejected && lastRejected.decisionAt) {
          const daysSinceRejection =
            (Date.now() - new Date(lastRejected.decisionAt).getTime()) /
            (1000 * 60 * 60 * 24);
          const cooldownDays =
            REVIEWER_APPLICATION_CONFIG.REAPPLICATION_COOLDOWN_DAYS;
          if (daysSinceRejection < cooldownDays) {
            setReapplyInfo({
              canReapply: false,
              daysUntilReapply: Math.ceil(cooldownDays - daysSinceRejection),
            });
          } else {
            setReapplyInfo({ canReapply: true });
          }
        } else {
          setReapplyInfo({ canReapply: true });
        }
      }
    } catch {
      showToast("Failed to load data", undefined, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time validation
  useEffect(() => {
    const errors: typeof validationErrors = {};
    if (motivation.trim().length > 0 && motivation.trim().length < 10) {
      errors.motivation = "Must be at least 10 characters";
    }
    if (experience.trim().length > 0 && experience.trim().length < 10) {
      errors.experience = "Must be at least 10 characters";
    }
    if (
      contributionExamples.trim().length > 0 &&
      contributionExamples.trim().length < 10
    ) {
      errors.contributionExamples = "Must be at least 10 characters";
    }
    setValidationErrors(errors);
  }, [motivation, experience, contributionExamples]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedSuccessfully(false);

    if (!eligibility?.eligible) {
      showToast(
        "You do not meet the eligibility requirements",
        undefined,
        "error"
      );
      return;
    }

    if (application?.status === "pending") {
      showToast("You already have a pending application", undefined, "error");
      return;
    }

    if (motivation.trim().length < 10) {
      setValidationErrors((prev) => ({
        ...prev,
        motivation: "Must be at least 10 characters",
      }));
      showToast(
        "Motivation text must be at least 10 characters",
        undefined,
        "error"
      );
      return;
    }

    if (experience.trim().length < 10) {
      setValidationErrors((prev) => ({
        ...prev,
        experience: "Must be at least 10 characters",
      }));
      showToast(
        "Experience text must be at least 10 characters",
        undefined,
        "error"
      );
      return;
    }

    if (contributionExamples.trim().length < 10) {
      setValidationErrors((prev) => ({
        ...prev,
        contributionExamples: "Must be at least 10 characters",
      }));
      showToast(
        "Contribution examples must be at least 10 characters",
        undefined,
        "error"
      );
      return;
    }

    if (!agreedToRules) {
      showToast(
        "You must agree to the reviewer guidelines",
        undefined,
        "error"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reviewer-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({
          motivation: motivation.trim(),
          experience: experience.trim(),
          contributionExamples: contributionExamples.trim(),
          timeAvailability: timeAvailability.trim() || undefined,
          languages: languages.length > 0 ? languages.join(", ") : undefined,
          priorExperience: priorExperience.trim() || undefined,
          agreedToRules: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit application");
      }

      setSubmittedSuccessfully(true);
      showToast("Application submitted successfully!", undefined, "success");
      setMotivation("");
      setExperience("");
      setContributionExamples("");
      setTimeAvailability("");
      setLanguages([]);
      setLanguageInput("");
      setPriorExperience("");
      setAgreedToRules(false);
      setValidationErrors({});
      await fetchData();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to submit application",
        undefined,
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg-primary))]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <LoadingSkeleton height="h-8" width="w-48" className="mb-6" />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== "user") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg-primary))]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] mb-6 transition-colors"
        >
          <FaArrowLeft />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-[rgb(var(--text-primary))] mb-8">
          Become a Reviewer
        </h1>

        {/* Eligibility Requirements - Prominent Display */}
        {eligibility && (
          <div
            className={`mb-8 p-6 rounded-lg border-2 ${
              eligibility.eligible
                ? "bg-green-500/10 border-green-500/50"
                : "bg-red-500/10 border-red-500/50"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              {eligibility.eligible ? (
                <FaCheckCircle className="text-green-500" size={24} />
              ) : (
                <FaTimesCircle className="text-red-500" size={24} />
              )}
              <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                {eligibility.eligible
                  ? "You are eligible to apply!"
                  : "You are not yet eligible"}
              </h2>
            </div>

            {/* Requirements Summary */}
            <div className="mb-4 p-4 bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))]">
              <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-3">
                Eligibility Requirements:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-[rgb(var(--text-secondary))]">
                    Account Age:{" "}
                  </span>
                  <strong
                    className={
                      eligibility.accountAgeDays >=
                      REVIEWER_APPLICATION_CONFIG.MIN_ACCOUNT_AGE_DAYS
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {eligibility.accountAgeDays} days
                  </strong>
                  <span className="text-xs text-[rgb(var(--text-secondary))] block">
                    (Required:{" "}
                    {REVIEWER_APPLICATION_CONFIG.MIN_ACCOUNT_AGE_DAYS} days)
                  </span>
                </div>
                <div>
                  <span className="text-[rgb(var(--text-secondary))]">
                    Corrections Submitted:{" "}
                  </span>
                  <strong
                    className={
                      eligibility.submissionsCount >=
                      REVIEWER_APPLICATION_CONFIG.MIN_CORRECTIONS_SUBMITTED
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {eligibility.submissionsCount}
                  </strong>
                  <span className="text-xs text-[rgb(var(--text-secondary))] block">
                    (Required:{" "}
                    {REVIEWER_APPLICATION_CONFIG.MIN_CORRECTIONS_SUBMITTED})
                  </span>
                </div>
                <div>
                  <span className="text-[rgb(var(--text-secondary))]">
                    Corrections Accepted:{" "}
                  </span>
                  <strong
                    className={
                      eligibility.approvedCount >=
                      REVIEWER_APPLICATION_CONFIG.MIN_CORRECTIONS_ACCEPTED
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {eligibility.approvedCount}
                  </strong>
                  <span className="text-xs text-[rgb(var(--text-secondary))] block">
                    (Required:{" "}
                    {REVIEWER_APPLICATION_CONFIG.MIN_CORRECTIONS_ACCEPTED})
                  </span>
                </div>
                <div>
                  <span className="text-[rgb(var(--text-secondary))]">
                    Corrections Rejected:{" "}
                  </span>
                  <strong className="text-[rgb(var(--text-primary))]">
                    {eligibility.rejectedCount ?? 0}
                  </strong>
                </div>
                <div>
                  <span className="text-[rgb(var(--text-secondary))]">
                    Approval Rate:{" "}
                  </span>
                  <strong
                    className={
                      (eligibility.approvalRate ?? 0) >=
                      REVIEWER_APPLICATION_CONFIG.MIN_APPROVAL_RATE
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {eligibility.rejectedCount !== undefined &&
                    eligibility.approvedCount !== undefined &&
                    eligibility.approvedCount + (eligibility.rejectedCount ?? 0) >
                      0
                      ? `${Math.round((eligibility.approvalRate ?? 0) * 100)}%`
                      : "—"}
                  </strong>
                  <span className="text-xs text-[rgb(var(--text-secondary))] block">
                    (Required:{" "}
                    {Math.round(
                      REVIEWER_APPLICATION_CONFIG.MIN_APPROVAL_RATE * 100
                    )}
                    %)
                  </span>
                </div>
              </div>
              {session?.user?.id && (
                <div className="mt-4 flex gap-4">
                  <Link
                    href={`/profile/${session.user.id}`}
                    className="text-sm text-[#107c10] hover:underline inline-flex items-center gap-1"
                  >
                    View My Profile <FaExternalLinkAlt size={12} />
                  </Link>
                </div>
              )}
            </div>

            {!eligibility.eligible &&
              eligibility.missingRequirements.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-2">
                    Missing Requirements:
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-[rgb(var(--text-secondary))]">
                    {eligibility.missingRequirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}

        {/* Success State */}
        {submittedSuccessfully && (
          <div className="mb-6 p-6 bg-green-500/10 border-2 border-green-500/50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <FaCheckCircle className="text-green-500" size={24} />
              <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                Application Submitted Successfully!
              </h2>
            </div>
            <p className="text-sm text-[rgb(var(--text-secondary))] mt-2">
              Your application has been submitted and is now under review. You
              will be notified once a decision has been made.
            </p>
          </div>
        )}

        {/* Application Status */}
        {application && (
          <div className="mb-6 p-4 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card))]">
            <div className="flex items-center gap-3 mb-2">
              {application.status === "pending" && (
                <FaClock className="text-yellow-500" size={20} />
              )}
              {application.status === "approved" && (
                <FaCheckCircle className="text-green-500" size={20} />
              )}
              {application.status === "rejected" && (
                <FaTimesCircle className="text-red-500" size={20} />
              )}
              <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">
                Application Status:{" "}
                <span className="capitalize">{application.status}</span>
              </h2>
            </div>

            <div className="mt-4 space-y-2 text-sm text-[rgb(var(--text-secondary))]">
              <div>
                Submitted:{" "}
                <strong>
                  {new Date(application.createdAt).toLocaleDateString()}
                </strong>
              </div>
              {application.decisionAt && (
                <div>
                  Decision Date:{" "}
                  <strong>
                    {new Date(application.decisionAt).toLocaleDateString()}
                  </strong>
                </div>
              )}
              {application.adminNotes && (
                <div className="mt-2 p-2 bg-[rgb(var(--bg-card-alt))] rounded">
                  <strong>Admin Notes:</strong> {application.adminNotes}
                </div>
              )}
            </div>

            {application.status === "pending" && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                <p className="text-sm text-[rgb(var(--text-secondary))]">
                  Your application is under review. Please be patient while our
                  admins review your application.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Application Form */}
        {eligibility?.eligible &&
          !application &&
          reapplyInfo?.canReapply !== false && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Motivation (Required) */}
              <div>
                <label
                  htmlFor="motivation"
                  className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2"
                >
                  Why do you want to become a reviewer?{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="motivation"
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  rows={4}
                  className={`w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 border ${
                    validationErrors.motivation
                      ? "border-red-500 focus:ring-red-500"
                      : "border-[rgb(var(--border-color))] focus:ring-[#107c10]"
                  } focus:outline-none focus:ring-2`}
                  placeholder="Tell us about your motivation to become a reviewer..."
                  required
                  minLength={10}
                  maxLength={2000}
                />
                <div className="mt-1 flex justify-between items-center">
                  <p className="text-xs text-[rgb(var(--text-secondary))]">
                    {motivation.length}/2000 characters
                  </p>
                  {validationErrors.motivation && (
                    <p className="text-xs text-red-500">
                      {validationErrors.motivation}
                    </p>
                  )}
                </div>
              </div>

              {/* Experience with Platform (Required) */}
              <div>
                <label
                  htmlFor="experience"
                  className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2"
                >
                  How familiar are you with Games for Windows LIVE?{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="experience"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  rows={4}
                  className={`w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 border ${
                    validationErrors.experience
                      ? "border-red-500 focus:ring-red-500"
                      : "border-[rgb(var(--border-color))] focus:ring-[#107c10]"
                  } focus:outline-none focus:ring-2`}
                  placeholder="e.g., years using it, hardware owned, games played, etc."
                  required
                  minLength={10}
                  maxLength={2000}
                />
                <div className="mt-1 flex justify-between items-center">
                  <p className="text-xs text-[rgb(var(--text-secondary))]">
                    {experience.length}/2000 characters
                  </p>
                  {validationErrors.experience && (
                    <p className="text-xs text-red-500">
                      {validationErrors.experience}
                    </p>
                  )}
                </div>
              </div>

              {/* Examples of Contribution (Required) */}
              <div>
                <label
                  htmlFor="contributionExamples"
                  className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2"
                >
                  Examples of contribution{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="contributionExamples"
                  value={contributionExamples}
                  onChange={(e) => setContributionExamples(e.target.value)}
                  rows={4}
                  className={`w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 border ${
                    validationErrors.contributionExamples
                      ? "border-red-500 focus:ring-red-500"
                      : "border-[rgb(var(--border-color))] focus:ring-[#107c10]"
                  } focus:outline-none focus:ring-2`}
                  placeholder="Link to or mention 2–5 corrections you submitted that show your attention to detail..."
                  required
                  minLength={10}
                  maxLength={2000}
                />
                <div className="mt-1 flex justify-between items-center">
                  <p className="text-xs text-[rgb(var(--text-secondary))]">
                    {contributionExamples.length}/2000 characters
                  </p>
                  {validationErrors.contributionExamples && (
                    <p className="text-xs text-red-500">
                      {validationErrors.contributionExamples}
                    </p>
                  )}
                </div>
              </div>

              {/* Time & Availability (Optional) */}
              <div>
                <label
                  htmlFor="timeAvailability"
                  className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2"
                >
                  How much time can you contribute to reviewing corrections per
                  week?
                  <span className="text-xs text-[rgb(var(--text-secondary))] ml-2">
                    (Optional)
                  </span>
                </label>
                <input
                  type="text"
                  id="timeAvailability"
                  value={timeAvailability}
                  onChange={(e) => setTimeAvailability(e.target.value)}
                  className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 border border-[rgb(var(--border-color))] focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                  placeholder="e.g., 5-10 hours per week"
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">
                  {timeAvailability.length}/500 characters
                </p>
              </div>

              {/* Languages (Optional) */}
              <div>
                <label
                  htmlFor="languages"
                  className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2"
                >
                  Which languages can you read/write?
                  <span className="text-xs text-[rgb(var(--text-secondary))] ml-2">
                    (Optional)
                  </span>
                </label>

                {/* Language Badges */}
                {languages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {languages.map((lang, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-[#107c10] text-white rounded-full text-sm"
                      >
                        {lang}
                        <button
                          type="button"
                          onClick={() => {
                            setLanguages(languages.filter((_, i) => i !== idx));
                          }}
                          className="hover:bg-[#0d6b0d] rounded-full p-0.5 transition-colors"
                          aria-label={`Remove ${lang}`}
                        >
                          <FaTimes size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Language Input with Autocomplete */}
                <div className="relative">
                  <input
                    type="text"
                    id="languages"
                    value={languageInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLanguageInput(value);
                      setShowLanguageSuggestions(value.length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && languageInput.trim()) {
                        e.preventDefault();
                        const trimmed = languageInput.trim();
                        if (
                          !languages.includes(trimmed) &&
                          trimmed.length > 0
                        ) {
                          setLanguages([...languages, trimmed]);
                          setLanguageInput("");
                          setShowLanguageSuggestions(false);
                        }
                      } else if (e.key === "," && languageInput.trim()) {
                        e.preventDefault();
                        const trimmed = languageInput.trim().replace(/,/g, "");
                        if (
                          !languages.includes(trimmed) &&
                          trimmed.length > 0
                        ) {
                          setLanguages([...languages, trimmed]);
                          setLanguageInput("");
                          setShowLanguageSuggestions(false);
                        }
                      } else if (e.key === "Escape") {
                        setShowLanguageSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      if (languageInput.length > 0) {
                        setShowLanguageSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay to allow click on suggestion
                      setTimeout(() => setShowLanguageSuggestions(false), 200);
                    }}
                    className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 border border-[rgb(var(--border-color))] focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                    placeholder="Type and press Enter or comma to add languages..."
                  />

                  {/* Autocomplete Suggestions */}
                  {showLanguageSuggestions && languageInput.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filterLanguages(languageInput).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            if (!languages.includes(lang)) {
                              setLanguages([...languages, lang]);
                              setLanguageInput("");
                              setShowLanguageSuggestions(false);
                            }
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-[rgb(var(--bg-card-alt))] transition-colors ${
                            languages.includes(lang)
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                          disabled={languages.includes(lang)}
                        >
                          <span className="text-sm text-[rgb(var(--text-primary))]">
                            {lang}
                          </span>
                          {languages.includes(lang) && (
                            <span className="ml-2 text-xs text-[rgb(var(--text-secondary))]">
                              (already added)
                            </span>
                          )}
                        </button>
                      ))}
                      {filterLanguages(languageInput).length === 0 && (
                        <div className="px-4 py-2 text-sm text-[rgb(var(--text-secondary))]">
                          No matching languages found. Press Enter to add &quot;
                          {languageInput}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">
                  Type a language and press Enter or comma to add it. You can
                  add multiple languages.
                </p>
              </div>

              {/* Prior Experience (Optional) */}
              <div>
                <label
                  htmlFor="priorExperience"
                  className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2"
                >
                  Have you been a moderator/reviewer elsewhere? Where?
                  <span className="text-xs text-[rgb(var(--text-secondary))] ml-2">
                    (Optional)
                  </span>
                </label>
                <textarea
                  id="priorExperience"
                  value={priorExperience}
                  onChange={(e) => setPriorExperience(e.target.value)}
                  rows={3}
                  className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 border border-[rgb(var(--border-color))] focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                  placeholder="Describe your prior moderation or reviewer experience..."
                  maxLength={1000}
                />
                <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">
                  {priorExperience.length}/1000 characters
                </p>
              </div>

              {/* Agreement Checkbox (Required) */}
              <div className="flex items-start gap-3 p-4 bg-[rgb(var(--bg-card-alt))] rounded-lg border border-[rgb(var(--border-color))]">
                <input
                  type="checkbox"
                  id="agreedToRules"
                  checked={agreedToRules}
                  onChange={(e) => setAgreedToRules(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#107c10] bg-[rgb(var(--bg-card))] border-[rgb(var(--border-color))] rounded focus:ring-2 focus:ring-[#107c10]"
                  required
                />
                <label
                  htmlFor="agreedToRules"
                  className="text-sm text-[rgb(var(--text-primary))] cursor-pointer"
                >
                  I agree to be impartial and act in the community&apos;s best
                  interest. <span className="text-red-500">*</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !motivation.trim() ||
                  !experience.trim() ||
                  !contributionExamples.trim() ||
                  !agreedToRules
                }
                className="w-full bg-[#107c10] hover:bg-[#0d6b0d] text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          )}

        {/* Application History */}
        {applicationHistory.length > 0 && (
          <div className="mt-6 p-4 bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] rounded-lg">
            <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] mb-3">
              Application History
            </h3>
            <div className="space-y-2">
              {applicationHistory.map((app) => {
                const isExpanded = expandedHistoryId === app.id;
                return (
                  <div
                    key={app.id}
                    className="bg-[rgb(var(--bg-card-alt))] rounded border border-[rgb(var(--border-color))] overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedHistoryId(isExpanded ? null : app.id)
                      }
                      className="w-full p-3 flex items-center justify-between hover:bg-[rgb(var(--bg-card))] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {app.status === "pending" && (
                          <FaClock className="text-yellow-500" size={16} />
                        )}
                        {app.status === "approved" && (
                          <FaCheckCircle className="text-green-500" size={16} />
                        )}
                        {app.status === "rejected" && (
                          <FaTimesCircle className="text-red-500" size={16} />
                        )}
                        <span className="text-sm font-medium text-[rgb(var(--text-primary))] capitalize">
                          {app.status}
                        </span>
                        <span className="text-xs text-[rgb(var(--text-secondary))]">
                          Submitted:{" "}
                          {new Date(app.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {isExpanded ? (
                        <FaChevronUp
                          className="text-[rgb(var(--text-secondary))]"
                          size={14}
                        />
                      ) : (
                        <FaChevronDown
                          className="text-[rgb(var(--text-secondary))]"
                          size={14}
                        />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="p-3 pt-0 border-t border-[rgb(var(--border-color))] space-y-3">
                        <div className="grid grid-cols-2 mt-4 gap-4 text-sm">
                          <div>
                            <span className="text-[rgb(var(--text-secondary))]">
                              Submitted:
                            </span>{" "}
                            <strong className="text-[rgb(var(--text-primary))]">
                              {new Date(app.createdAt).toLocaleString()}
                            </strong>
                          </div>
                          {app.decisionAt && (
                            <div>
                              <span className="text-[rgb(var(--text-secondary))]">
                                Decision:
                              </span>{" "}
                              <strong className="text-[rgb(var(--text-primary))]">
                                {new Date(app.decisionAt).toLocaleString()}
                              </strong>
                            </div>
                          )}
                        </div>
                        {app.motivationText && (
                          <div>
                            <h4 className="text-xs font-semibold text-[rgb(var(--text-primary))] mb-1">
                              Motivation:
                            </h4>
                            <p className="text-sm text-[rgb(var(--text-secondary))] whitespace-pre-wrap">
                              {app.motivationText}
                            </p>
                          </div>
                        )}
                        {app.experienceText && (
                          <div>
                            <h4 className="text-xs font-semibold text-[rgb(var(--text-primary))] mb-1">
                              Experience:
                            </h4>
                            <p className="text-sm text-[rgb(var(--text-secondary))] whitespace-pre-wrap">
                              {app.experienceText}
                            </p>
                          </div>
                        )}
                        {app.contributionExamples && (
                          <div>
                            <h4 className="text-xs font-semibold text-[rgb(var(--text-primary))] mb-1">
                              Contribution Examples:
                            </h4>
                            <p className="text-sm text-[rgb(var(--text-secondary))] whitespace-pre-wrap">
                              {app.contributionExamples}
                            </p>
                          </div>
                        )}
                        {app.timeAvailability && (
                          <div>
                            <h4 className="text-xs font-semibold text-[rgb(var(--text-primary))] mb-1">
                              Time Availability:
                            </h4>
                            <p className="text-sm text-[rgb(var(--text-secondary))]">
                              {app.timeAvailability}
                            </p>
                          </div>
                        )}
                        {app.languages && (
                          <div>
                            <h4 className="text-xs font-semibold text-[rgb(var(--text-primary))] mb-1">
                              Languages:
                            </h4>
                            <p className="text-sm text-[rgb(var(--text-secondary))]">
                              {app.languages}
                            </p>
                          </div>
                        )}
                        {app.priorExperience && (
                          <div>
                            <h4 className="text-xs font-semibold text-[rgb(var(--text-primary))] mb-1">
                              Prior Experience:
                            </h4>
                            <p className="text-sm text-[rgb(var(--text-secondary))] whitespace-pre-wrap">
                              {app.priorExperience}
                            </p>
                          </div>
                        )}
                        {app.adminNotes && (
                          <div className="p-2 bg-[rgb(var(--bg-card))] rounded border border-[rgb(var(--border-color))]">
                            <h4 className="text-xs font-semibold text-[rgb(var(--text-primary))] mb-1">
                              Admin Notes:
                            </h4>
                            <p className="text-sm text-[rgb(var(--text-secondary))] whitespace-pre-wrap">
                              {app.adminNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cooldown Message */}
        {reapplyInfo && !reapplyInfo.canReapply && (
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <FaClock className="text-yellow-500" size={20} />
              <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">
                Re-application Cooldown
              </h3>
            </div>
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              You cannot submit a new application yet. Please wait{" "}
              <strong>{reapplyInfo.daysUntilReapply} more day(s)</strong> before
              you can re-apply.
            </p>
          </div>
        )}

        {eligibility?.eligible &&
          application?.status === "rejected" &&
          reapplyInfo?.canReapply && (
            <div className="mt-6 p-4 bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] rounded-lg">
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                Your previous application was rejected. You can submit a new
                application if you believe your circumstances have changed.
              </p>
            </div>
          )}

        {!eligibility?.eligible && (
          <div className="mt-6 p-4 bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] rounded-lg">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="text-yellow-500 mt-1" />
              <div>
                <p className="text-sm text-[rgb(var(--text-secondary))]">
                  You need to meet all eligibility requirements before you can
                  apply. Keep contributing corrections to the site to become
                  eligible!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
