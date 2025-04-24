import Link from "next/link";
import { FaGamepad, FaQuestionCircle, FaUsers } from "react-icons/fa";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#107c10] to-[#0e6b0e] rounded-lg shadow-xl p-8 mb-12 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome to GFWL Hub
          </h1>
          <p className="text-xl mb-8">
            A community resource for Games for Windows LIVE abandoned games.
            Find fixes, support, and connect with other players.
          </p>
          <div>
            <Link
              href="https://community.pcgamingwiki.com/files/file/1012-microsoft-games-for-windows-live/?do=download&r=3736&confirm=1&t=1&csrfKey=72a35fbfd8ae582fe891f867e376ddcc"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-[#107c10] hover:bg-gray-200 px-6 py-3 rounded-md text-lg font-medium transition-colors inline-block"
            >
              Download Games for Windows LIVE
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-[#202020] p-6 rounded-lg shadow-md border-t-4 border-[#107c10] transform transition-transform hover:scale-105">
          <div className="text-[#107c10] text-4xl mb-4 flex justify-center">
            <FaGamepad />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-center text-white">
            Game Support
          </h2>
          <p className="mb-4 text-gray-300">
            Check our list of supported games and find out which titles can be
            fixed with our tools.
          </p>
          <div className="text-center">
            <Link
              href="/supported-games"
              className="text-[#107c10] hover:text-[#0e6b0e] transition-colors font-medium"
            >
              View Supported Games →
            </Link>
          </div>
        </div>

        <div className="bg-[#202020] p-6 rounded-lg shadow-md border-t-4 border-[#107c10] transform transition-transform hover:scale-105">
          <div className="text-[#107c10] text-4xl mb-4 flex justify-center">
            <FaQuestionCircle />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-center text-white">
            FAQ
          </h2>
          <p className="mb-4 text-gray-300">
            Find answers to common questions about GFWL issues and our fixes.
          </p>
          <div className="text-center">
            <Link
              href="/faq"
              className="text-[#107c10] hover:text-[#0e6b0e] transition-colors font-medium"
            >
              Read FAQ →
            </Link>
          </div>
        </div>

        <div className="bg-[#202020] p-6 rounded-lg shadow-md border-t-4 border-[#107c10] transform transition-transform hover:scale-105">
          <div className="text-[#107c10] text-4xl mb-4 flex justify-center">
            <FaUsers />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-center text-white">
            Community
          </h2>
          <p className="mb-4 text-gray-300">
            Join our Discord server and connect with other GFWL game
            enthusiasts.
          </p>
          <div className="text-center">
            <Link
              href="/contact"
              className="text-[#107c10] hover:text-[#0e6b0e] transition-colors font-medium"
            >
              Join Community →
            </Link>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="bg-[#202020] p-8 rounded-lg shadow-xl text-white">
        <h2 className="text-2xl font-bold mb-4 text-center">About GFWL Hub</h2>
        <div className="max-w-3xl mx-auto">
          <p className="mb-4 text-gray-300">
            Games for Windows LIVE (GFWL) was Microsoft&apos;s gaming service
            that connected PC games to Xbox Live. Although Microsoft has
            discontinued the service, many games still require it to function
            properly.
          </p>
          <p className="mb-4 text-gray-300">
            Our community-driven project aims to keep these games playable by
            providing fixes, workarounds, and a place for gamers to connect and
            share solutions.
          </p>
          <p className="mb-4 text-gray-300">
            We are not affiliated with Microsoft or any other company. We are
            just a group of gamers who want to keep these games alive.
          </p>
          <p className="mb-4 text-center text-gray-300">
            <Link
              href="https://www.pcgamingwiki.com/wiki/Games_for_Windows_-_LIVE"
              className="text-[#107c10] hover:text-[#0e6b0e] transition-colors font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              PCGamingWiki
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
