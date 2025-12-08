import { FaExclamationTriangle } from "react-icons/fa";

export default function UnplayableGameBanner() {
  return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/40 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2">
        <FaExclamationTriangle className="text-red-600 dark:text-red-400 flex-shrink-0" size={16} />
        <p className="text-red-800 dark:text-red-200 text-sm">
          <span className="font-semibold">This game is unplayable</span> in its original form. Check below for alternatives.
        </p>
      </div>
    </div>
  );
}

