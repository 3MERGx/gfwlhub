"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FaExclamationTriangle } from "react-icons/fa";
import { Suspense } from "react";

const KNOWN_AUTH_ERROR_CODES = new Set([
  "Configuration",
  "AccessDenied",
  "Verification",
  "OAuthCallback",
  "OAuthSignin",
  "OAuthCreateAccount",
  "EmailCreateAccount",
  "Callback",
  "OAuthAccountNotLinked",
  "EmailSignin",
  "CredentialsSignin",
  "SessionRequired",
  "Default",
]);

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The verification link has expired or has already been used.",
    OAuthCallback: "The authentication request timed out. Please try again.",
    OAuthSignin: "Could not start the sign-in process. Please try again.",
    OAuthCreateAccount: "Could not create your account. Please try again.",
    Callback: "An error occurred during the authentication callback.",
    OAuthAccountNotLinked:
      "This account is already linked to a different sign-in method.",
    SessionRequired: "Please sign in to continue.",
    Default: "An error occurred during authentication.",
  };

  const knownCode =
    error && KNOWN_AUTH_ERROR_CODES.has(error) ? error : null;
  const errorMessage = knownCode
    ? errorMessages[knownCode] || errorMessages.Default
    : errorMessages.Default;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <div className="bg-[#2d2d2d] p-8 rounded-lg border border-red-500/30">
          {/* Header */}
          <div className="text-center mb-6">
            <FaExclamationTriangle className="text-red-500 mx-auto mb-4" size={48} />
            <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
            <p className="text-gray-400">{errorMessage}</p>
          </div>

          {/* Known error code only — never echo arbitrary query text */}
          {knownCode && knownCode !== "Default" && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">
                <strong>Error Code:</strong> {knownCode}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="block w-full bg-[#107c10] hover:bg-[#0d6b0d] text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
            >
              Return Home
            </Link>
          </div>

          {/* Help */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Need help?{" "}
              <Link
                href="https://discord.gg/PR75T8xMWS"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#107c10] hover:underline"
              >
                Join our Discord
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="bg-[#2d2d2d] p-8 rounded-lg border border-gray-700">
            <div className="text-center">
              <p className="text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
