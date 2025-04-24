import Link from "next/link";
import { FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";

export default function GameNotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-[#202020] p-8 rounded-lg shadow-xl">
          <div className="text-[#107c10] text-6xl mb-6 flex justify-center">
            <FaExclamationTriangle />
          </div>
          <h1 className="text-3xl font-bold mb-4 text-white">Game Not Found</h1>
          <p className="text-gray-300 mb-8">
            Sorry, we couldn&apos;t find the game you&apos;re looking for. It
            may have been removed or the URL might be incorrect.
          </p>
          <Link
            href="/supported-games"
            className="inline-flex items-center bg-[#107c10] hover:bg-[#0e6b0e] text-white px-6 py-3 rounded-md transition-colors"
          >
            <FaArrowLeft className="mr-2" /> View All Supported Games
          </Link>
        </div>
      </div>
    </div>
  );
}
