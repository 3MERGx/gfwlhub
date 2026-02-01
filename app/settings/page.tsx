"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useCSRF } from "@/hooks/useCSRF";
import { useState, useEffect } from "react";
import { safeLog } from "@/lib/security";
import {
  FaBell,
  FaLock,
  FaEye,
  FaPaintBrush,
  FaExclamationTriangle,
  FaTimes,
  FaUser,
  FaDownload,
  FaCheckCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { useTheme } from "@/components/ThemeProvider";

interface UserSettings {
  showStatistics: boolean;
  emailNotifications: boolean;
  reviewNotifications: boolean;
  theme?: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { csrfToken } = useCSRF();
  let theme: "dark" | "light" = "dark";
  let setTheme: (theme: "dark" | "light") => void = () => {};
  try {
    const themeHook = useTheme();
    theme = themeHook.theme;
    setTheme = themeHook.setTheme;
  } catch {
    // ThemeProvider not available, use default
  }
  const [settings, setSettings] = useState<UserSettings>({
    showStatistics: true,
    emailNotifications: false,
    reviewNotifications: false,
    theme: "dark",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [providerDisplayName, setProviderDisplayName] =
    useState<string>("OAuth");

  // Load settings on mount
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  // Fetch provider info
  useEffect(() => {
    // Fetch provider info from user API
    const fetchProviderInfo = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/users/${session.user.id}`);
          if (response.ok) {
            const data = await response.json();
            const provider =
              data.providerInfo?.provider || data.provider || "oauth";
            setProviderDisplayName(
              provider === "github"
                ? "GitHub"
                : provider === "discord"
                ? "Discord"
                : provider === "google"
                ? "Google"
                : "OAuth"
            );
          }
        } catch (error) {
          safeLog.error("Error fetching provider info:", error);
        }
      }
    };
    fetchProviderInfo();
  }, [session]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/users/${session?.user?.id}/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        // Don't apply theme from database on page load - let ThemeProvider manage it
        // The database theme is only used to display the current preference in the UI
        // The actual theme is managed by ThemeProvider via localStorage
        // This prevents unwanted theme switches when navigating to settings page
      }
    } catch (error) {
      safeLog.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (
    key: keyof UserSettings,
    value: boolean | string
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(true);
    setSaveMessage(null);

    // If updating theme, apply it immediately
    if (key === "theme" && typeof value === "string") {
      setTheme(value as "dark" | "light");
    }

    try {
      const response = await fetch(`/api/users/${session?.user?.id}/settings`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (response.ok) {
        setSaveMessage({
          type: "success",
          text: "Settings saved successfully!",
        });
        setTimeout(() => setSaveMessage(null), 3000);
        
        // Refresh UI
        if (pathname === "/settings") {
          router.refresh();
        }
      } else {
        throw new Error("Failed to save settings");
      }
    } catch {
      setSaveMessage({
        type: "error",
        text: "Failed to save settings. Please try again.",
      });
      // Revert the change
      setSettings(settings);
      // Revert theme if it was changed
      if (key === "theme") {
        setTheme((settings.theme || "dark") as "dark" | "light");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/users/${session?.user?.id}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gfwl-hub-data-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSaveMessage({
          type: "success",
          text: "Data exported successfully!",
        });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        throw new Error("Failed to export data");
      }
    } catch {
      setSaveMessage({
        type: "error",
        text: "Failed to export data. Please try again.",
      });
    } finally {
      setExporting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#107c10] mx-auto"></div>
            <p className="text-gray-700 dark:text-[rgb(var(--text-secondary))] mt-4">
              Loading settings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-8 text-center">
            <p className="text-gray-700 dark:text-[rgb(var(--text-secondary))]">
              Please sign in to access settings.
            </p>
            <Link
              href="/auth/signin"
              className="mt-4 inline-block px-4 py-2 bg-[#107c10] text-white rounded-lg hover:bg-[#0d6b0d] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-[#107c10] hover:underline text-sm mb-2 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-[rgb(var(--text-primary))] mb-2">
            Settings
          </h1>
          <p className="text-gray-700 dark:text-[rgb(var(--text-secondary))] text-sm md:text-base">
            Manage your preferences and account settings
          </p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              saveMessage.type === "success"
                ? "bg-green-900/20 border-green-500/30 text-green-400"
                : "bg-red-900/20 border-red-500/30 text-red-400"
            }`}
          >
            <div className="flex items-center gap-2">
              {saveMessage.type === "success" ? (
                <FaCheckCircle />
              ) : (
                <FaExclamationTriangle />
              )}
              <p>{saveMessage.text}</p>
            </div>
          </div>
        )}

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Account Information */}
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-6 border border-[rgb(var(--border-color))]">
            <div className="flex items-center gap-3 mb-4">
              <FaUser className="text-[#107c10]" size={24} />
              <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                Account Information
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 dark:text-[rgb(var(--text-secondary))] text-sm mb-1">
                  Name
                </p>
                <p className="text-[rgb(var(--text-primary))] font-medium">
                  {session.user.name || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-[rgb(var(--text-secondary))] text-sm mb-1">
                  Email
                </p>
                <p className="text-[rgb(var(--text-primary))] font-medium">
                  {session.user.email || "Not available"}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-[rgb(var(--text-secondary))] text-sm mb-1">
                  Role
                </p>
                <p className="text-[rgb(var(--text-primary))] font-medium capitalize">
                  {session.user.role}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-[rgb(var(--text-secondary))] text-sm mb-1">
                  Sign-in Provider
                </p>
                <p className="text-[rgb(var(--text-primary))] font-medium capitalize">
                  {providerDisplayName}
                </p>
              </div>
              <div className="pt-4 border-t border-[rgb(var(--border-color))]">
                <button
                  onClick={handleExportData}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaDownload size={16} />
                  {exporting ? "Exporting..." : "Export My Data"}
                </button>
                <p className="text-gray-700 dark:text-[rgb(var(--text-secondary))] text-xs mt-2">
                  Download a copy of all your data in JSON format
                </p>
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-6 border border-[rgb(var(--border-color))]">
            <div className="flex items-center gap-3 mb-4">
              <FaEye className="text-[#107c10]" size={24} />
              <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                Privacy
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-[rgb(var(--text-primary))] font-medium">
                    Show Recent Activity
                  </p>
                  <p className="text-gray-700 dark:text-[rgb(var(--text-secondary))] text-sm">
                    Display your recent submissions on your public profile.
                    <br />
                    <span className="text-gray-600 dark:text-[rgb(var(--text-secondary))] text-xs">
                      Admins can always see your activity.
                    </span>
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.showStatistics}
                    onChange={(e) =>
                      updateSetting("showStatistics", e.target.checked)
                    }
                    disabled={saving}
                  />
                  <div className="w-11 h-6 bg-[rgb(var(--bg-card-alt))] dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#107c10] disabled:opacity-50"></div>
                </label>
              </div>
              <div className="flex items-center justify-between opacity-75">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[rgb(var(--text-primary))] font-medium">
                      Show Friends List
                    </p>
                    <span className="px-2 py-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded border border-yellow-200 dark:border-yellow-500/30">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-[rgb(var(--text-secondary))] text-sm">
                    Display your friends list on your public profile
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-not-allowed">
                  <input type="checkbox" className="sr-only peer" disabled />
                  <div className="w-11 h-6 bg-gray-300 dark:bg-[rgb(var(--bg-card-alt))] rounded-full opacity-60 dark:opacity-50 border border-gray-400 dark:border-transparent"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-6 border border-[rgb(var(--border-color))] opacity-75">
            <div className="flex items-center gap-3 mb-4">
              <FaBell className="text-[#107c10]" size={24} />
              <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                Notifications
              </h2>
              <span className="ml-auto px-2 py-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded border border-yellow-200 dark:border-yellow-500/30">
                Coming Soon
              </span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-[rgb(var(--text-primary))] font-medium">
                    Email Notifications
                  </p>
                  <p className="text-gray-700 dark:text-[rgb(var(--text-secondary))] text-sm">
                    Receive email updates about your corrections and submissions
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-not-allowed">
                  <input type="checkbox" className="sr-only peer" disabled />
                  <div className="w-11 h-6 bg-[rgb(var(--bg-card-alt))] rounded-full opacity-50"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-[rgb(var(--text-primary))] font-medium">
                    Review Notifications
                  </p>
                  <p className="text-gray-700 dark:text-[rgb(var(--text-secondary))] text-sm">
                    Get notified when your submissions are reviewed
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-not-allowed">
                  <input type="checkbox" className="sr-only peer" disabled />
                  <div className="w-11 h-6 bg-[rgb(var(--bg-card-alt))] rounded-full opacity-50"></div>
                </label>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3 mt-4">
                <div className="flex items-start gap-2">
                  <FaInfoCircle className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-blue-900 dark:text-[rgb(var(--text-primary))] mb-2">
                      Email notifications require email provider configuration and will be available soon.
                    </p>
                    <p className="text-blue-900 dark:text-[rgb(var(--text-secondary))]">
                      <strong>In the meantime:</strong> All your corrections and game submissions are visible on{" "}
                      <Link 
                        href={`/profile/${session?.user?.id}`}
                        className="text-[#107c10] hover:underline font-medium"
                      >
                        your profile page
                      </Link>
                      {" "}with their current status (Pending, Approved, Rejected, etc.).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-6 border border-[rgb(var(--border-color))]">
            <div className="flex items-center gap-3 mb-4">
              <FaPaintBrush className="text-[#107c10]" size={24} />
              <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                Appearance
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[rgb(var(--text-primary))] font-medium mb-3 block">
                  Theme
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    onClick={() => updateSetting("theme", "dark")}
                    disabled={saving || theme === "dark"}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      theme === "dark"
                        ? "border-[#107c10] bg-[#107c10]/10 dark:bg-[#107c10]/20"
                        : "border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] hover:border-[#107c10]/50 hover:bg-[#107c10]/5"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="w-full h-20 rounded bg-gray-900 border-2 border-gray-700 mb-2 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-[#107c10]"></div>
                    </div>
                    <span className="text-[rgb(var(--text-primary))] font-medium text-sm">Dark</span>
                    {theme === "dark" && (
                      <div className="absolute top-2 right-2">
                        <FaCheckCircle className="text-[#107c10]" size={16} />
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => updateSetting("theme", "light")}
                    disabled={saving || theme === "light"}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      theme === "light"
                        ? "border-[#107c10] bg-[#107c10]/10 dark:bg-[#107c10]/20"
                        : "border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] hover:border-[#107c10]/50 hover:bg-[#107c10]/5"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="w-full h-20 rounded bg-white border-2 border-gray-300 mb-2 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-[#107c10]"></div>
                    </div>
                    <span className="text-[rgb(var(--text-primary))] font-medium text-sm">Light</span>
                    {theme === "light" && (
                      <div className="absolute top-2 right-2">
                        <FaCheckCircle className="text-[#107c10]" size={16} />
                      </div>
                    )}
                  </button>
                </div>
                <p className="text-gray-700 dark:text-[rgb(var(--text-secondary))] text-xs">
                  Choose your preferred color scheme. Changes apply immediately and are saved to your account.
                </p>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-6 border border-[rgb(var(--border-color))]">
            <div className="flex items-center gap-3 mb-4">
              <FaLock className="text-[#107c10]" size={24} />
              <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                Security
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[rgb(var(--text-primary))] font-medium mb-2">
                  Authentication Provider
                </p>
                <p className="text-gray-700 dark:text-[rgb(var(--text-secondary))] text-sm mb-3">
                  You&apos;re signed in with {providerDisplayName}. Your account
                  is secured by your provider&apos;s authentication system.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <FaLock className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-900 dark:text-[rgb(var(--text-secondary))] text-sm">
                      We never store your password. Authentication is handled
                      securely through OAuth providers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-900/10 border border-red-500/30 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
              <FaExclamationTriangle />
              Danger Zone
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Account
              </button>
              <p className="text-gray-700 dark:text-[rgb(var(--text-secondary))] text-sm">
                Once you delete your account, there is no going back. Your
                correction submissions will be preserved but attributed to
                &quot;Deleted Account&quot;.
              </p>
            </div>
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 p-4">
            <div className="bg-[rgb(var(--bg-card))] rounded-lg max-w-md w-full border border-red-500/30">
              {/* Header */}
              <div className="p-6 border-b border-[rgb(var(--border-color))]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-900/30 rounded-lg">
                      <FaExclamationTriangle
                        className="text-red-400"
                        size={24}
                      />
                    </div>
                    <h3 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                      Delete Account
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirm("");
                      setError("");
                    }}
                    className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                  >
                    <FaTimes size={20} />
                  </button>
                </div>
                <p className="text-gray-700 dark:text-[rgb(var(--text-secondary))] text-sm mt-2">
                  This action cannot be undone. This will permanently delete
                  your account and remove all associated data.
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[rgb(var(--text-primary))] font-medium mb-2 block">
                    Type <span className="font-mono text-red-400">DELETE</span>{" "}
                    to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => {
                      setDeleteConfirm(e.target.value);
                      setError("");
                    }}
                    placeholder="DELETE"
                    className="w-full px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-red-500 focus:outline-none font-mono"
                    disabled={isDeleting}
                  />
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[rgb(var(--border-color))] flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirm("");
                    setError("");
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[rgb(var(--border-color))]"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (deleteConfirm !== "DELETE") {
                      setError("Please type DELETE exactly to confirm");
                      return;
                    }

                    setIsDeleting(true);
                    setError("");

                    try {
                      const response = await fetch(
                        `/api/users/${session?.user?.id}`,
                        {
                          method: "DELETE",
                        }
                      );

                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(
                          error.error || "Failed to delete account"
                        );
                      }

                      // Sign out and redirect
                      await signOut({ callbackUrl: "/" });
                      router.push("/");
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Failed to delete account"
                      );
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting || deleteConfirm !== "DELETE"}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    "Delete Account"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
