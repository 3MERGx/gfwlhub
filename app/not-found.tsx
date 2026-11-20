import Link from "next/link";
import { FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg border border-[rgb(var(--border-color))] shadow-xl">
          <div className="text-[#107c10] text-6xl mb-6 flex justify-center">
            <FaExclamationTriangle />
          </div>
          <h1 className="text-3xl font-bold mb-4 text-[rgb(var(--text-primary))]">
            Page Not Found
          </h1>
          <p className="text-[rgb(var(--text-secondary))] mb-8">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It may
            have been moved or the URL might be incorrect.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center bg-[#107c10] hover:bg-[#0e6b0e] text-white px-6 py-3 rounded-md transition-colors"
            >
              <FaArrowLeft className="mr-2" /> Return Home
            </Link>
            <Link
              href="/supported-games"
              className="inline-flex items-center border border-[rgb(var(--border-color))] hover:border-[#107c10] text-[rgb(var(--text-primary))] px-6 py-3 rounded-md transition-colors"
            >
              Supported Games
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center border border-[rgb(var(--border-color))] hover:border-[#107c10] text-[rgb(var(--text-primary))] px-6 py-3 rounded-md transition-colors"
            >
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
