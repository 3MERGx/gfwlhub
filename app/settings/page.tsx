"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaBell, FaLock, FaEye, FaPaintBrush, FaExclamationTriangle, FaTimes } from "react-icons/fa";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#2d2d2d] rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#107c10] mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#2d2d2d] rounded-lg p-8 text-center">
            <p className="text-gray-400">Please sign in to access settings.</p>
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
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Settings
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Manage your preferences and account settings
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Notifications - Disabled */}
          <div className="bg-[#2d2d2d] rounded-lg p-6 border border-gray-700 opacity-50">
            <div className="flex items-center gap-3 mb-4">
              <FaBell className="text-[#107c10]" size={24} />
              <h2 className="text-xl font-bold text-white">Notifications</h2>
              <span className="ml-auto px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded border border-yellow-500/30">
                Coming Soon
              </span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Email Notifications</p>
                  <p className="text-gray-400 text-sm">
                    Receive updates about your corrections
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-not-allowed">
                  <input type="checkbox" className="sr-only peer" disabled />
                  <div className="w-11 h-6 bg-gray-800 rounded-full opacity-50"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Review Notifications</p>
                  <p className="text-gray-400 text-sm">
                    Get notified when your submissions are reviewed
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-not-allowed">
                  <input type="checkbox" className="sr-only peer" disabled />
                  <div className="w-11 h-6 bg-gray-800 rounded-full opacity-50"></div>
                </label>
              </div>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mt-4">
                <p className="text-gray-300 text-sm">
                  📧 Email notifications are not yet configured. This feature will be available soon.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-[#2d2d2d] rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <FaEye className="text-[#107c10]" size={24} />
              <h2 className="text-xl font-bold text-white">Privacy</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Public Profile</p>
                  <p className="text-gray-400 text-sm">
                    Show your profile to other users
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#107c10]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Show Statistics</p>
                  <p className="text-gray-400 text-sm">
                    Display your contribution stats publicly
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#107c10]"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-[#2d2d2d] rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <FaPaintBrush className="text-[#107c10]" size={24} />
              <h2 className="text-xl font-bold text-white">Appearance</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-white font-medium mb-2 block">
                  Theme
                </label>
                <select className="w-full md:w-auto px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none">
                  <option value="dark">Dark (Current)</option>
                  <option value="light" disabled>
                    Light (Coming Soon)
                  </option>
                  <option value="auto" disabled>
                    Auto (Coming Soon)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-[#2d2d2d] rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <FaLock className="text-[#107c10]" size={24} />
              <h2 className="text-xl font-bold text-white">Security</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-white font-medium mb-2">
                  Authentication Provider
                </p>
                <p className="text-gray-400 text-sm mb-3">
                  You&apos;re signed in with OAuth. Your account is secured by your
                  provider&apos;s authentication system.
                </p>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-gray-300 text-sm">
                    🔒 We never store your password. Authentication is handled
                    securely through OAuth providers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-900/10 border border-red-500/30 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-400 mb-4">Danger Zone</h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Account
              </button>
              <p className="text-gray-400 text-sm">
                Once you delete your account, there is no going back. Your correction submissions will be preserved but attributed to &quot;Deleted Account&quot;.
              </p>
            </div>
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
            <div className="bg-[#2d2d2d] rounded-lg max-w-md w-full border border-red-500/30">
              {/* Header */}
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-900/30 rounded-lg">
                      <FaExclamationTriangle className="text-red-400" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Delete Account</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirm("");
                      setError("");
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <FaTimes size={20} />
                  </button>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  This action cannot be undone. This will permanently delete your account and remove all associated data.
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-white font-medium mb-2 block">
                    Type <span className="font-mono text-red-400">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => {
                      setDeleteConfirm(e.target.value);
                      setError("");
                    }}
                    placeholder="DELETE"
                    className="w-full px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none font-mono"
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
              <div className="p-6 border-t border-gray-700 flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirm("");
                    setError("");
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      const response = await fetch(`/api/users/${session?.user?.id}`, {
                        method: "DELETE",
                      });

                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || "Failed to delete account");
                      }

                      // Sign out and redirect
                      await signOut({ callbackUrl: "/" });
                      router.push("/");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to delete account");
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

