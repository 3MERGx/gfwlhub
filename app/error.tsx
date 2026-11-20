"use client";

import Link from "next/link";
import { FaExclamationTriangle } from "react-icons/fa";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg border border-red-500/30 shadow-xl">
          <div className="text-red-500 text-6xl mb-6 flex justify-center">
            <FaExclamationTriangle />
          </div>
          <h1 className="text-3xl font-bold mb-4 text-[rgb(var(--text-primary))]">
            Something went wrong
          </h1>
          <p className="text-[rgb(var(--text-secondary))] mb-4">
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p className="text-xs text-[rgb(var(--text-muted))] mb-6">
              Reference: {error.digest}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center bg-[#107c10] hover:bg-[#0e6b0e] text-white px-6 py-3 rounded-md transition-colors"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] px-6 py-3 rounded-md border border-[rgb(var(--border-color))] transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
