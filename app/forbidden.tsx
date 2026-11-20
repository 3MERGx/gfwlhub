import Link from "next/link";
import { FaLock, FaArrowLeft } from "react-icons/fa";

export default function Forbidden() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg border border-red-500/30 shadow-xl">
          <div className="text-red-500 text-6xl mb-6 flex justify-center">
            <FaLock />
          </div>
          <h1 className="text-3xl font-bold mb-4 text-[rgb(var(--text-primary))]">
            Access Denied
          </h1>
          <p className="text-[rgb(var(--text-secondary))] mb-8">
            You do not have permission to view this page.
          </p>
          <Link
            href="/"
            className="inline-flex items-center bg-[#107c10] hover:bg-[#0e6b0e] text-white px-6 py-3 rounded-md transition-colors"
          >
            <FaArrowLeft className="mr-2" /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
