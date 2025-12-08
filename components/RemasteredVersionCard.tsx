import { FaInfoCircle } from "react-icons/fa";

interface RemasteredVersionCardProps {
  remasteredName: string;
  remasteredPlatform?: string;
}

export default function RemasteredVersionCard({
  remasteredName,
  remasteredPlatform,
}: RemasteredVersionCardProps) {
  return (
    <div className="bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-500/40 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2">
        <FaInfoCircle className="text-blue-700 dark:text-blue-400 flex-shrink-0" size={16} />
        <p className="text-blue-900 dark:text-blue-200 text-sm font-medium">
          <span className="font-bold">Remastered version available:</span> {remasteredName}
          {remasteredPlatform && ` on ${remasteredPlatform}`}
        </p>
      </div>
    </div>
  );
}

