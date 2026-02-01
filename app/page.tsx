"use client";

import Link from "next/link";
import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FaGamepad,
  FaQuestionCircle,
  FaUsers,
  FaDownload,
  FaArrowRight,
  FaCheckCircle,
  FaEdit,
  FaChartLine,
} from "react-icons/fa";

function HomeContent() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const canViewLeaderboard =
    session?.user?.role === "reviewer" || session?.user?.role === "admin";

  // Check if we just came back from OAuth and have a stored callbackUrl
  useEffect(() => {
    // Only check if we're authenticated (just signed in)
    if (status === "authenticated") {
      const storedCallbackUrl = localStorage.getItem("gfwl_callback_url");
      if (storedCallbackUrl && storedCallbackUrl !== "/") {
        // Clean up and redirect
        localStorage.removeItem("gfwl_callback_url");
        router.replace(storedCallbackUrl);
        return;
      }
    }
  }, [status, router]);
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section
        className="bg-gradient-to-br from-[#107c10] via-[#0e6b0e] to-[#0a5a0a] rounded-lg shadow-2xl p-8 md:p-12 mb-12 text-white relative overflow-hidden"
        aria-labelledby="hero-heading"
      >
        <div
          className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"
          aria-hidden
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1
            id="hero-heading"
            className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
          >
            Welcome to the GFWL Hub
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-100">
            A community-driven resource for keeping Games for Windows LIVE games
            playable. Find fixes, support, and connect with fellow gamers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="https://community.pcgamingwiki.com/files/file/1012-microsoft-games-for-windows-live/?do=download&r=3736&confirm=1&t=1&csrfKey=72a35fbfd8ae582fe891f867e376ddcc"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-[#107c10] hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0e6b0e]"
              aria-label="Download GFWL client from PCGamingWiki (opens in new tab)"
            >
              <FaDownload size={20} aria-hidden />
              Download GFWL Client
            </Link>
            <Link
              href="/supported-games"
              className="bg-[#107c10]/20 hover:bg-[#107c10]/30 border-2 border-white/30 hover:border-white/50 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0e6b0e]"
            >
              Browse Games
              <FaArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
        aria-labelledby="features-heading"
      >
        <h2 id="features-heading" className="sr-only">
          Key features
        </h2>
        <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg shadow-xl border border-[rgb(var(--border-color))] border-t-4 border-t-[#107c10] transform transition-all hover:scale-105 hover:shadow-2xl group focus-within:ring-2 focus-within:ring-[#107c10] focus-within:ring-offset-2 focus-within:ring-offset-[rgb(var(--bg-card))]">
          <div className="text-[#107c10] text-5xl mb-6 flex justify-center group-hover:scale-110 transition-transform" aria-hidden>
            <FaGamepad />
          </div>
          <h3 className="text-2xl font-bold mb-4 text-center text-[rgb(var(--text-primary))]">
            Game Support
          </h3>
          <p className="mb-6 text-[rgb(var(--text-secondary))] text-center">
            Browse our comprehensive list of supported games. Find installation
            guides, fixes, and community resources for your favorite GFWL
            titles.
          </p>
          <div className="text-center">
            <Link
              href="/supported-games"
              className="text-[#107c10] hover:text-[#0e6b0e] transition-colors font-semibold inline-flex items-center gap-2 group-hover:gap-3 focus:outline-none focus:ring-2 focus:ring-[#107c10] focus:ring-offset-2 focus:ring-offset-[rgb(var(--bg-card))] rounded"
            >
              View Supported Games
              <FaArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>

        <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg shadow-xl border border-[rgb(var(--border-color))] border-t-4 border-t-[#107c10] transform transition-all hover:scale-105 hover:shadow-2xl group focus-within:ring-2 focus-within:ring-[#107c10] focus-within:ring-offset-2 focus-within:ring-offset-[rgb(var(--bg-card))]">
          <div className="text-[#107c10] text-5xl mb-6 flex justify-center group-hover:scale-110 transition-transform" aria-hidden>
            <FaQuestionCircle />
          </div>
          <h3 className="text-2xl font-bold mb-4 text-center text-[rgb(var(--text-primary))]">
            FAQ
          </h3>
          <p className="mb-6 text-[rgb(var(--text-secondary))] text-center">
            Get answers to common questions about GFWL issues, activation
            problems, and troubleshooting. Find solutions quickly.
          </p>
          <div className="text-center">
            <Link
              href="/faq"
              className="text-[#107c10] hover:text-[#0e6b0e] transition-colors font-semibold inline-flex items-center gap-2 group-hover:gap-3 focus:outline-none focus:ring-2 focus:ring-[#107c10] focus:ring-offset-2 focus:ring-offset-[rgb(var(--bg-card))] rounded"
            >
              Read FAQ
              <FaArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>

        <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg shadow-xl border border-[rgb(var(--border-color))] border-t-4 border-t-[#107c10] transform transition-all hover:scale-105 hover:shadow-2xl group focus-within:ring-2 focus-within:ring-[#107c10] focus-within:ring-offset-2 focus-within:ring-offset-[rgb(var(--bg-card))]">
          <div className="text-[#107c10] text-5xl mb-6 flex justify-center group-hover:scale-110 transition-transform" aria-hidden>
            <FaUsers />
          </div>
          <h3 className="text-2xl font-bold mb-4 text-center text-[rgb(var(--text-primary))]">
            Community
          </h3>
          <p className="mb-6 text-[rgb(var(--text-secondary))] text-center">
            Join our Discord server and connect with other GFWL enthusiasts.
            Share tips, get help, and contribute to the community.
          </p>
          <div className="text-center">
            <Link
              href="/contact"
              className="text-[#107c10] hover:text-[#0e6b0e] transition-colors font-semibold inline-flex items-center gap-2 group-hover:gap-3 focus:outline-none focus:ring-2 focus:ring-[#107c10] focus:ring-offset-2 focus:ring-offset-[rgb(var(--bg-card))] rounded"
            >
              Join Community
              <FaArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        className="bg-[rgb(var(--bg-card))] p-8 md:p-12 rounded-lg shadow-xl mb-12"
        aria-labelledby="how-it-works-heading"
      >
        <h2 id="how-it-works-heading" className="text-3xl font-bold mb-8 text-center text-[rgb(var(--text-primary))]">
          How It Works
        </h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto list-none" aria-label="Steps">
          <li className="text-center">
            <div className="w-16 h-16 bg-[#107c10] rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden>
              <FaGamepad className="text-white text-2xl" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-[rgb(var(--text-primary))]">
              Find Your Game
            </h3>
            <p className="text-[rgb(var(--text-secondary))]">
              Browse our list of supported games and find the one you want to
              play.
            </p>
          </li>
          <li className="text-center">
            <div className="w-16 h-16 bg-[#107c10] rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden>
              <FaDownload className="text-white text-2xl" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-[rgb(var(--text-primary))]">
              Get the Fix
            </h3>
            <p className="text-[rgb(var(--text-secondary))]">
              Download the necessary files and follow our step-by-step
              installation guides.
            </p>
          </li>
          <li className="text-center">
            <div className="w-16 h-16 bg-[#107c10] rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden>
              <FaCheckCircle className="text-white text-2xl" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-[rgb(var(--text-primary))]">
              Start Playing
            </h3>
            <p className="text-[rgb(var(--text-secondary))]">
              Launch your game and enjoy! Join our community for support and
              updates.
            </p>
          </li>
        </ol>
      </section>

      {/* Contribute Section */}
      <section
        className="bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] p-8 md:p-12 rounded-lg shadow-xl mb-12"
        aria-labelledby="contribute-heading"
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-[#107c10] text-5xl mb-6 flex justify-center" aria-hidden>
            <FaEdit />
          </div>
          <h2 id="contribute-heading" className="text-3xl font-bold mb-4 text-[rgb(var(--text-primary))]">
            Help Improve GFWL Hub
          </h2>
          <p className="text-xl mb-4 text-[rgb(var(--text-secondary))]">
            This is a community-driven project. Your contributions help keep
            these games playable for everyone.
          </p>
          {canViewLeaderboard && (
            <p className="mb-8 text-[rgb(var(--text-secondary))]">
              <Link
                href="/leaderboard"
                className="text-[#107c10] hover:text-[#0e6b0e] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#107c10] focus:ring-offset-2 focus:ring-offset-[rgb(var(--bg-card))] rounded"
              >
                See top contributors on the leaderboard
              </Link>
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-[rgb(var(--bg-card))] p-6 rounded-lg border border-[rgb(var(--border-color))]">
              <FaEdit className="text-[#107c10] text-3xl mb-3" aria-hidden />
              <h3 className="text-lg font-semibold mb-2 text-[rgb(var(--text-primary))]">
                Submit Corrections
              </h3>
              <p className="text-[rgb(var(--text-secondary))] text-sm">
                Found an error or have updated information? Submit a correction
                to help improve our database.
              </p>
            </div>
            <div className="bg-[rgb(var(--bg-card))] p-6 rounded-lg border border-[rgb(var(--border-color))]">
              <FaChartLine className="text-[#107c10] text-3xl mb-3" aria-hidden />
              <h3 className="text-lg font-semibold mb-2 text-[rgb(var(--text-primary))]">
                Add Game Details
              </h3>
              <p className="text-[rgb(var(--text-secondary))] text-sm">
                Help us add complete information for games that need more
                details.
              </p>
            </div>
          </div>
          <Link
            href={status === "authenticated" ? "/dashboard" : "/auth/signin"}
            className="bg-[#107c10] hover:bg-[#0e6b0e] text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] focus:ring-offset-2 focus:ring-offset-[rgb(var(--bg-primary))]"
          >
            {status === "authenticated" ? "Go to Dashboard" : "Get Started"}
            <FaArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section
        className="bg-[rgb(var(--bg-card))] p-8 md:p-12 rounded-lg shadow-xl text-[rgb(var(--text-primary))]"
        aria-labelledby="about-heading"
      >
        <h2 id="about-heading" className="text-3xl font-bold mb-6 text-center">About GFWL Hub</h2>
        <div className="max-w-4xl mx-auto space-y-6">
          <p className="text-lg text-[rgb(var(--text-secondary))] leading-relaxed">
            Games for Windows LIVE (GFWL) was Microsoft&apos;s gaming service
            that connected PC games to Xbox Live. Although Microsoft has
            discontinued the service, many games still require it to function
            properly.
          </p>
          <p className="text-lg text-[rgb(var(--text-secondary))] leading-relaxed">
            Our community-driven project aims to keep these games playable by
            providing fixes, workarounds, and a place for gamers to connect and
            share solutions. We maintain a comprehensive database of supported
            games, installation guides, and community resources.
          </p>
          <p className="text-lg text-[rgb(var(--text-secondary))] leading-relaxed">
            We are not affiliated with Microsoft or any other company. We are
            just a group of gamers who want to keep these classic titles alive
            and accessible for future generations.
          </p>
          <div className="text-center pt-4">
            <Link
              href="https://www.pcgamingwiki.com/wiki/Games_for_Windows_-_LIVE"
              className="text-[#107c10] hover:text-[#0e6b0e] transition-colors font-semibold inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#107c10] focus:ring-offset-2 focus:ring-offset-[rgb(var(--bg-card))] rounded"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Learn more on PCGamingWiki (opens in new tab)"
            >
              Learn more on PCGamingWiki
              <FaArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <div
            className="animate-pulse rounded-lg bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] w-full max-w-4xl h-64"
            aria-hidden
          />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
