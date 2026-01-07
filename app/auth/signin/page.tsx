"use client";

import { signIn, useSession } from "next-auth/react";
import {
  FaGoogle,
  FaGithub,
  FaDiscord,
  FaShieldAlt,
  FaUsers,
  FaEdit,
  FaClock,
  FaCheckCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { safeLog } from "@/lib/security";

function SignInContent() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [lastUsedProvider, setLastUsedProvider] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get the callback URL from query params, localStorage, or default to homepage
  // Priority: URL params > localStorage > referrer > default
  const storedCallbackUrlLS = typeof window !== "undefined" 
    ? (() => {
        try {
          return localStorage.getItem("gfwl_callback_url");
        } catch {
          // localStorage might be unavailable (private browsing, etc.)
          return null;
        }
      })()
    : null;
  
  // Get callbackUrl from URL params
  // Try useSearchParams first, then fallback to window.location.search
  let urlCallbackUrl = searchParams.get("callbackUrl") || searchParams.get("from");
  
  // Fallback: Read directly from window.location.search if useSearchParams didn't work
  if (!urlCallbackUrl && typeof window !== "undefined") {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      urlCallbackUrl = urlParams.get("callbackUrl") || urlParams.get("from");
    } catch {
      // Invalid URL, ignore
    }
  }
  
  // Try to extract callbackUrl from referrer if it's a valid game/page URL
  let referrerCallbackUrl: string | null = null;
  if (typeof window !== "undefined" && document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      const referrerPath = referrerUrl.pathname;
      // Only use referrer if it's a valid page (not homepage, not sign-in, not dashboard)
      if (referrerPath && referrerPath !== "/" && referrerPath !== "/auth/signin" && !referrerPath.startsWith("/dashboard")) {
        referrerCallbackUrl = referrerPath;
      }
    } catch {
      // Invalid referrer URL, ignore
    }
  }
  
  // Get from URL params (if present), then localStorage, then referrer, then default
  const rawCallbackUrl =
    urlCallbackUrl || 
    storedCallbackUrlLS ||
    referrerCallbackUrl ||
    "/";
  
  // Decode the callbackUrl if it's URL-encoded
  const decodedCallbackUrl = rawCallbackUrl !== "/" 
    ? (() => {
        try {
          return decodeURIComponent(rawCallbackUrl);
        } catch {
          // Invalid encoding, use as-is
          return rawCallbackUrl;
        }
      })()
    : rawCallbackUrl;
  const callbackUrl = decodedCallbackUrl.startsWith("/dashboard")
    ? "/"
    : decodedCallbackUrl;

  // Debug logging removed - only log errors if needed

  // CRITICAL: Store callbackUrl in localStorage IMMEDIATELY (synchronously) when component renders
  // This ensures it's available before any OAuth redirect happens
  // localStorage works even if cookies are disabled
  if (typeof window !== "undefined" && callbackUrl && callbackUrl !== "/") {
    try {
      const currentStored = localStorage.getItem("gfwl_callback_url");
      if (currentStored !== callbackUrl) {
        localStorage.setItem("gfwl_callback_url", callbackUrl);
        // Only log in development
        if (process.env.NODE_ENV === "development") {
          safeLog.log("Stored callbackUrl in localStorage:", callbackUrl);
        }
      }
    } catch {
      // localStorage might be unavailable, continue without it
    }
  }

  // Redirect authenticated users away from sign-in page
  useEffect(() => {
    if (status === "authenticated" && session) {
      // Get callbackUrl from URL params, localStorage, or default to homepage
      // localStorage works even if cookies are disabled
      const urlCallbackUrl = searchParams.get("callbackUrl");
      const storedCallbackUrlFromLS = localStorage.getItem("gfwl_callback_url");
      
      // Check if we're coming back from OAuth by checking the URL parameters
      // OAuth providers add code= and state= parameters when redirecting back
      const isComingFromOAuth = window.location.search.includes("code=") || 
                                  window.location.search.includes("state=") ||
                                  window.location.search.includes("error=");
      
      // Log all localStorage items for debugging
      const allLocalStorageItems: Record<string, string> = {};
      if (typeof window !== "undefined") {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            allLocalStorageItems[key] = localStorage.getItem(key) || "";
          }
        }
      }
      
      safeLog.log("Auth redirect check:", {
        urlCallbackUrl,
        storedCallbackUrlFromLS,
        callbackUrl,
        status,
        hasSession: !!session,
        pathname: window.location.pathname,
        isComingFromOAuth,
        search: window.location.search,
        fullUrl: window.location.href,
        allLocalStorageItems,
        documentReferrer: document.referrer,
      });
      
      // Decode URL callbackUrl if present
      const decodedUrlCallbackUrl = urlCallbackUrl 
        ? decodeURIComponent(urlCallbackUrl)
        : null;
      
      // If coming from OAuth and we have a stored callbackUrl, prioritize it
      // Otherwise, prioritize: URL param > localStorage > component state > default
      let finalCallbackUrl: string;
      if (isComingFromOAuth && storedCallbackUrlFromLS) {
        // Coming back from OAuth - use stored callbackUrl
        finalCallbackUrl = storedCallbackUrlFromLS;
        safeLog.log("Coming from OAuth, using stored callbackUrl from localStorage:", finalCallbackUrl);
      } else {
        // Normal flow - check URL params first, then localStorage
        finalCallbackUrl = decodedUrlCallbackUrl || storedCallbackUrlFromLS || callbackUrl || "/";
      }
      
      // Ensure it's not a dashboard route (regular users can't access)
      if (finalCallbackUrl.startsWith("/dashboard")) {
        finalCallbackUrl = "/";
      }
      
      // Clean up stored callbackUrl after using it
      if (storedCallbackUrlFromLS) {
        localStorage.removeItem("gfwl_callback_url");
        safeLog.log("Cleaned up stored callbackUrl from localStorage");
      }
      
      safeLog.log("Redirecting authenticated user to:", finalCallbackUrl);
      
      // Redirect immediately (no delay needed)
      router.replace(finalCallbackUrl);
    }
  }, [status, session, router, callbackUrl, searchParams]);

  // Also store in useEffect as backup (in case URL changes)
  useEffect(() => {
    if (callbackUrl && callbackUrl !== "/") {
      const currentStored = localStorage.getItem("gfwl_callback_url");
      if (currentStored !== callbackUrl) {
        localStorage.setItem("gfwl_callback_url", callbackUrl);
        safeLog.log("Stored callbackUrl in localStorage (useEffect backup):", callbackUrl);
      }
    }
  }, [callbackUrl]);
  
  // On mount, check if we have a referrer and no callbackUrl stored
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("gfwl_callback_url");
      if (!stored && document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          const referrerPath = referrerUrl.pathname;
          // Only use referrer if it's a valid page (not homepage, not sign-in, not dashboard)
          if (referrerPath && referrerPath !== "/" && referrerPath !== "/auth/signin" && !referrerPath.startsWith("/dashboard")) {
            localStorage.setItem("gfwl_callback_url", referrerPath);
            safeLog.log("Stored referrer as callbackUrl in localStorage (on mount):", referrerPath);
          }
        } catch {
          // Invalid referrer URL, ignore
        }
      }
    }
  }, []);

         // Load last used provider from localStorage on mount
         useEffect(() => {
           try {
             const storedProvider = localStorage.getItem("gfwl_last_provider");
             if (storedProvider) {
               setLastUsedProvider(storedProvider);
             }
           } catch {
             // localStorage might be unavailable, continue without it
           }
         }, []);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // If already authenticated, show message while redirecting
  if (status === "authenticated" && session) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a]">
        <div className="max-w-md w-full bg-[#1e1e1e] p-8 rounded-2xl border border-[#107c10]/50 shadow-2xl text-center">
          <div className="inline-block p-3 bg-[#107c10] rounded-full mb-4 animate-pulse">
            <FaCheckCircle className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Already Signed In
          </h2>
          <div className="mb-4 p-3 bg-[#107c10]/10 border border-[#107c10]/30 rounded-lg">
            <p className="text-white font-medium">
              {session.user?.name || session.user?.email}
            </p>
          </div>
          <div className="mb-6 space-y-2">
            <p className="text-gray-300">
              You&apos;re already signed in. Redirecting you...
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <FaInfoCircle size={14} />
              <span>
                To sign in with a different provider, please sign out first.
              </span>
            </div>
          </div>
          <Link
            href={callbackUrl}
            className="inline-block px-6 py-3 bg-[#107c10] hover:bg-[#0d6b0d] text-white font-medium rounded-xl transition-colors"
          >
            Continue Now
          </Link>
        </div>
      </div>
    );
  }

  const handleSignIn = async (provider: string) => {
    setIsLoading(provider);
    try {
      // Store this provider as last used
      try {
        localStorage.setItem("gfwl_last_provider", provider);
        localStorage.setItem("gfwl_last_provider_time", new Date().toISOString());
      } catch {
        // localStorage might be unavailable, continue anyway
      }

      // CRITICAL: Re-check localStorage right before OAuth to ensure we have the latest value
      // The callbackUrl from component state might be "/" if detection failed
      let finalCallbackUrl = callbackUrl;
      
      if (typeof window !== "undefined") {
        try {
          const latestStored = localStorage.getItem("gfwl_callback_url");
          if (latestStored && latestStored !== "/" && latestStored !== callbackUrl) {
            // If localStorage has a different (non-default) value, use it
            finalCallbackUrl = latestStored;
          }
        } catch {
          // localStorage might be unavailable, use callbackUrl from state
        }
      }

      // CRITICAL: Store callbackUrl in localStorage BEFORE OAuth redirect
      // NextAuth doesn't reliably preserve callbackUrl through OAuth flow
      // localStorage works even if cookies are disabled
      if (finalCallbackUrl && finalCallbackUrl !== "/") {
        try {
          localStorage.setItem("gfwl_callback_url", finalCallbackUrl);
        } catch {
          // localStorage might be unavailable, continue anyway
        }
      }
      
      // Ensure callbackUrl is a valid relative path
      const validCallbackUrl = finalCallbackUrl && finalCallbackUrl.startsWith("/") 
        ? finalCallbackUrl 
        : "/";
      
      // Use signIn with callbackUrl option - NextAuth should preserve it in OAuth state
      // If NextAuth loses it, the client-side code will use localStorage as backup
      await signIn(provider, { 
        callbackUrl: validCallbackUrl,
        redirect: true 
      });
    } catch (error) {
      safeLog.error("Sign in error:", error);
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
              Help preserve gaming history by contributing accurate information
              about Games for Windows LIVE titles.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#107c10] rounded-lg flex items-center justify-center">
                <FaEdit className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Submit Corrections
                </h3>
                <p className="text-gray-400 text-sm">
                  Help us maintain accurate game information by submitting
                  corrections and updates.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#107c10] rounded-lg flex items-center justify-center">
                <FaUsers className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Community Driven
                </h3>
                <p className="text-gray-400 text-sm">
                  Join a community of passionate gamers preserving classic GFWL
                  titles.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-[#107c10] rounded-lg flex items-center justify-center">
                <FaShieldAlt className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Secure & Private
                </h3>
                <p className="text-gray-400 text-sm">
                  We use secure OAuth authentication and never store your
                  passwords.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800">
            <p className="text-gray-500 text-sm">
              Need help?{" "}
              <Link
                href="/contact"
                className="text-[#107c10] hover:text-[#0d6b0d] transition-colors"
              >
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
              <h2 className="text-3xl font-bold text-white mb-2">
                Welcome Back
              </h2>
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
                🔒 Your data is secure. We only access your basic profile
                information to create your account.
              </p>
            </div>

            {/* Mobile marketing content */}
            <div className="md:hidden mt-6 pt-6 border-t border-gray-800 space-y-4">
              <div className="flex items-center gap-3">
                <FaEdit className="text-[#107c10]" size={20} />
                <p className="text-gray-400 text-sm">
                  Submit corrections and help the community
                </p>
              </div>
              <div className="flex items-center gap-3">
                <FaUsers className="text-[#107c10]" size={20} />
                <p className="text-gray-400 text-sm">
                  Join passionate GFWL preservationists
                </p>
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
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
