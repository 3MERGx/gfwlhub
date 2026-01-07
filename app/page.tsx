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
  const { status } = useSession();

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
  // Stats fetching removed - stats display is commented out in JSX
  // Keeping the structure in case we want to re-enable stats later
  // const [stats, setStats] = useState<Stats | null>(null);
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   async function fetchStats() {
  //     try {
  //       const gamesRes = await fetch("/api/games");
  //       if (gamesRes.ok) {
  //         const games = await gamesRes.json();
  //         const supportedGames = games.filter(
  //           (game: { status: string }) => game.status === "supported"
  //         ).length;
  //         let contributorCount = 0;
  //         try {
  //           const leaderboardRes = await fetch("/api/leaderboard");
  //           if (leaderboardRes.ok) {
  //             const leaderboard = await leaderboardRes.json();
  //             contributorCount = leaderboard.filter(
  //               (user: { submissionsCount: number }) =>
  //                 (user.submissionsCount || 0) > 0
  //             ).length;
  //           }
  //         } catch {
  //           console.log("Could not fetch contributor count");
  //         }
  //         setStats({
  //           totalGames: games.length,
  //           supportedGames,
  //           totalContributors: contributorCount,
  //         });
  //       }
  //     } catch (error) {
  //       console.error("Error fetching stats:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   fetchStats();
  // }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#107c10] via-[#0e6b0e] to-[#0a5a0a] rounded-lg shadow-2xl p-8 md:p-12 mb-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
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
              className="bg-white text-[#107c10] hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
            >
              <FaDownload size={20} />
              Download GFWL
            </Link>
            <Link
              href="/supported-games"
              className="bg-[#107c10]/20 hover:bg-[#107c10]/30 border-2 border-white/30 hover:border-white/50 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all inline-flex items-center gap-2"
            >
              Browse Games
              <FaArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {/* {!loading && stats && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#202020] p-6 rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <FaGamepad className="text-[#107c10] text-3xl" />
              <span className="text-4xl font-bold text-white">
                {stats.totalGames}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Total Games</p>
          </div>
          <div className="bg-[#202020] p-6 rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <FaCheckCircle className="text-green-500 text-3xl" />
              <span className="text-4xl font-bold text-white">
                {stats.supportedGames}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Supported Games</p>
          </div>
          <div className="bg-[#202020] p-6 rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <FaUsers className="text-blue-500 text-3xl" />
              <span className="text-4xl font-bold text-white">
                {stats.totalContributors}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Community Contributors</p>
          </div>
        </section>
      )} */}

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg shadow-xl border-t-4 border-t-[#107c10] border-x border-y border-b border-[rgb(var(--border-color))] transform transition-all hover:scale-105 hover:shadow-2xl group">
          <div className="text-[#107c10] text-5xl mb-6 flex justify-center group-hover:scale-110 transition-transform">
            <FaGamepad />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-center text-[rgb(var(--text-primary))]">
            Game Support
          </h2>
          <p className="mb-6 text-[rgb(var(--text-secondary))] text-center">
            Browse our comprehensive list of supported games. Find installation
            guides, fixes, and community resources for your favorite GFWL
            titles.
          </p>
          <div className="text-center">
            <Link
              href="/supported-games"
              className="text-[#107c10] hover:text-[#0e6b0e] transition-colors font-semibold inline-flex items-center gap-2 group-hover:gap-3"
            >
              View Supported Games
              <FaArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg shadow-xl border-t-4 border-t-[#107c10] border-x border-y border-b border-[rgb(var(--border-color))] transform transition-all hover:scale-105 hover:shadow-2xl group">
          <div className="text-[#107c10] text-5xl mb-6 flex justify-center group-hover:scale-110 transition-transform">
            <FaQuestionCircle />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-center text-[rgb(var(--text-primary))]">
            FAQ
          </h2>
          <p className="mb-6 text-[rgb(var(--text-secondary))] text-center">
            Get answers to common questions about GFWL issues, activation
            problems, and troubleshooting. Find solutions quickly.
          </p>
          <div className="text-center">
            <Link
              href="/faq"
              className="text-[#107c10] hover:text-[#0e6b0e] transition-colors font-semibold inline-flex items-center gap-2 group-hover:gap-3"
            >
              Read FAQ
              <FaArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg shadow-xl border-t-4 border-t-[#107c10] border-x border-y border-b border-[rgb(var(--border-color))] transform transition-all hover:scale-105 hover:shadow-2xl group">
          <div className="text-[#107c10] text-5xl mb-6 flex justify-center group-hover:scale-110 transition-transform">
            <FaUsers />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-center text-[rgb(var(--text-primary))]">
            Community
          </h2>
          <p className="mb-6 text-[rgb(var(--text-secondary))] text-center">
            Join our Discord server and connect with other GFWL enthusiasts.
            Share tips, get help, and contribute to the community.
          </p>
          <div className="text-center">
            <Link
              href="/contact"
              className="text-[#107c10] hover:text-[#0e6b0e] transition-colors font-semibold inline-flex items-center gap-2 group-hover:gap-3"
            >
              Join Community
              <FaArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-[rgb(var(--bg-card))] p-8 md:p-12 rounded-lg shadow-xl mb-12">
        <h2 className="text-3xl font-bold mb-8 text-center text-[rgb(var(--text-primary))]">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#107c10] rounded-full flex items-center justify-center mx-auto mb-4">
              <FaGamepad className="text-white text-2xl" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-[rgb(var(--text-primary))]">
              Find Your Game
            </h3>
            <p className="text-[rgb(var(--text-secondary))]">
              Browse our list of supported games and find the one you want to
              play.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-[#107c10] rounded-full flex items-center justify-center mx-auto mb-4">
              <FaDownload className="text-white text-2xl" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-[rgb(var(--text-primary))]">
              Get the Fix
            </h3>
            <p className="text-[rgb(var(--text-secondary))]">
              Download the necessary files and follow our step-by-step
              installation guides.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-[#107c10] rounded-full flex items-center justify-center mx-auto mb-4">
              <FaCheckCircle className="text-white text-2xl" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-[rgb(var(--text-primary))]">
              Start Playing
            </h3>
            <p className="text-[rgb(var(--text-secondary))]">
              Launch your game and enjoy! Join our community for support and
              updates.
            </p>
          </div>
        </div>
      </section>

      {/* Contribute Section */}
      <section className="bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] p-8 md:p-12 rounded-lg shadow-xl mb-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-[#107c10] text-5xl mb-6 flex justify-center">
            <FaEdit />
          </div>
          <h2 className="text-3xl font-bold mb-4 text-[rgb(var(--text-primary))]">
            Help Improve GFWL Hub
          </h2>
          <p className="text-xl mb-8 text-[rgb(var(--text-secondary))]">
            This is a community-driven project. Your contributions help keep
            these games playable for everyone.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-[rgb(var(--bg-card))] p-6 rounded-lg border border-[rgb(var(--border-color))]">
              <FaEdit className="text-[#107c10] text-3xl mb-3" />
              <h3 className="text-lg font-semibold mb-2 text-[rgb(var(--text-primary))]">
                Submit Corrections
              </h3>
              <p className="text-[rgb(var(--text-secondary))] text-sm">
                Found an error or have updated information? Submit a correction
                to help improve our database.
              </p>
            </div>
            <div className="bg-[rgb(var(--bg-card))] p-6 rounded-lg border border-[rgb(var(--border-color))]">
              <FaChartLine className="text-[#107c10] text-3xl mb-3" />
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
            href="/auth/signin"
            className="bg-[#107c10] hover:bg-[#0e6b0e] text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
          >
            Get Started
            <FaArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-[rgb(var(--bg-card))] p-8 md:p-12 rounded-lg shadow-xl text-[rgb(var(--text-primary))]">
        <h2 className="text-3xl font-bold mb-6 text-center">About GFWL Hub</h2>
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
              className="text-[#107c10] hover:text-[#0e6b0e] transition-colors font-semibold inline-flex items-center gap-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more on PCGamingWiki
              <FaArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
