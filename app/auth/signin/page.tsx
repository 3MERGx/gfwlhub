"use client";

import { signIn } from "next-auth/react";
import { FaGoogle, FaGithub, FaDiscord, FaShieldAlt, FaUsers, FaEdit, FaClock } from "react-icons/fa";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SignInContent() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [lastUsedProvider, setLastUsedProvider] = useState<string | null>(null);
  const searchParams = useSearchParams();
  
  // Get the callback URL from query params, or default to homepage
  // If callbackUrl is a dashboard route, redirect to homepage instead (regular users can't access dashboard)
  const rawCallbackUrl = searchParams.get("callbackUrl") || searchParams.get("from") || "/";
  const callbackUrl = rawCallbackUrl.startsWith("/dashboard") ? "/" : rawCallbackUrl;

  // Load last used provider from localStorage on mount
  useEffect(() => {
    const storedProvider = localStorage.getItem("gfwl_last_provider");
    if (storedProvider) {
      setLastUsedProvider(storedProvider);
    }
  }, []);

  const handleSignIn = async (provider: string) => {
    setIsLoading(provider);
    try {
      // Store this provider as last used
      localStorage.setItem("gfwl_last_provider", provider);
      localStorage.setItem("gfwl_last_provider_time", new Date().toISOString());
      
      await signIn(provider, { callbackUrl });
    } catch (error) {
      console.error("Sign in error:", error);
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a]">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
        {/* Left Side - Marketing Content */}
        <div className="hidden md:block space-y-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Join the GFWL Hub Community
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
              Help preserve gaming history by contributing accurate information about Games for Windows LIVE titles.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#107c10] rounded-lg flex items-center justify-center">
                <FaEdit className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Submit Corrections</h3>
                <p className="text-gray-400 text-sm">
                  Help us maintain accurate game information by submitting corrections and updates.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#107c10] rounded-lg flex items-center justify-center">
                <FaUsers className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Community Driven</h3>
                <p className="text-gray-400 text-sm">
                  Join a community of passionate gamers preserving classic GFWL titles.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#107c10] rounded-lg flex items-center justify-center">
                <FaShieldAlt className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Secure & Private</h3>
                <p className="text-gray-400 text-sm">
                  We use secure OAuth authentication and never store your passwords.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800">
            <p className="text-gray-500 text-sm">
              Need help?{" "}
              <Link href="/contact" className="text-[#107c10] hover:text-[#0d6b0d] transition-colors">
                Contact us
              </Link>
            </p>
          </div>
        </div>

        {/* Right Side - Sign In Form */}
        <div className="w-full">
          <div className="bg-[#1e1e1e] p-8 rounded-2xl border border-gray-800 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-[#107c10] rounded-full mb-4">
                <FaShieldAlt className="text-white" size={32} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-gray-400">Sign in to continue to GFWL Hub</p>
            </div>

            {/* Sign In Buttons */}
            <div className="space-y-3">
              {/* Google */}
              <button
                onClick={() => handleSignIn("google")}
                disabled={isLoading !== null}
                className={`w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-medium py-3.5 px-4 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg relative ${
                  lastUsedProvider === "google" ? "ring-2 ring-[#107c10]" : ""
                }`}
              >
                {lastUsedProvider === "google" && (
                  <div className="absolute -top-2 -right-2 bg-[#107c10] text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <FaClock size={10} />
                    <span>Last Used</span>
                  </div>
                )}
                <FaGoogle size={20} />
                <span>
                  {isLoading === "google"
                    ? "Signing in..."
                    : "Continue with Google"}
                </span>
              </button>

              {/* Discord */}
              <button
                onClick={() => handleSignIn("discord")}
                disabled={isLoading !== null}
                className={`w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3.5 px-4 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg relative ${
                  lastUsedProvider === "discord" ? "ring-2 ring-[#107c10]" : ""
                }`}
              >
                {lastUsedProvider === "discord" && (
                  <div className="absolute -top-2 -right-2 bg-[#107c10] text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <FaClock size={10} />
                    <span>Last Used</span>
                  </div>
                )}
                <FaDiscord size={20} />
                <span>
                  {isLoading === "discord"
                    ? "Signing in..."
                    : "Continue with Discord"}
                </span>
              </button>

              {/* GitHub */}
              <button
                onClick={() => handleSignIn("github")}
                disabled={isLoading !== null}
                className={`w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 text-white font-medium py-3.5 px-4 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg border border-gray-700 relative ${
                  lastUsedProvider === "github" ? "ring-2 ring-[#107c10]" : ""
                }`}
              >
                {lastUsedProvider === "github" && (
                  <div className="absolute -top-2 -right-2 bg-[#107c10] text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <FaClock size={10} />
                    <span>Last Used</span>
                  </div>
                )}
                <FaGithub size={20} />
                <span>
                  {isLoading === "github"
                    ? "Signing in..."
                    : "Continue with GitHub"}
                </span>
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-8 p-4 bg-gradient-to-br from-[#107c10]/10 to-[#0d6b0d]/10 border border-[#107c10]/30 rounded-xl">
              <p className="text-gray-300 text-sm text-center leading-relaxed">
                🔒 Your data is secure. We only access your basic profile information to create your account.
              </p>
            </div>

            {/* Mobile marketing content */}
            <div className="md:hidden mt-6 pt-6 border-t border-gray-800 space-y-4">
              <div className="flex items-center gap-3">
                <FaEdit className="text-[#107c10]" size={20} />
                <p className="text-gray-400 text-sm">Submit corrections and help the community</p>
              </div>
              <div className="flex items-center gap-3">
                <FaUsers className="text-[#107c10]" size={20} />
                <p className="text-gray-400 text-sm">Join passionate GFWL preservationists</p>
              </div>
            </div>
          </div>

          {/* Back to home link */}
          <div className="text-center mt-6">
            <Link
              href="/"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
