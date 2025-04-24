import React from "react";
import Link from "next/link";
import { FaShieldAlt } from "react-icons/fa";

export interface VirusTotalWidgetProps {
  fileHash: string;
  fileName?: string;
}

const VirusTotalWidget: React.FC<VirusTotalWidgetProps> = ({
  fileHash,
  fileName,
}) => {
  if (!fileHash) return null;

  const virusTotalUrl = `https://www.virustotal.com/gui/file/${fileHash}/detection`;

  return (
    <div className="bg-[#2d2d2d] p-4 rounded-lg">
      <div className="flex items-center mb-3">
        <FaShieldAlt className="text-green-500 mr-2" size={20} />
        <span className="text-gray-300">File Security Information</span>
      </div>
      {fileName && (
        <p className="text-sm text-gray-300 mb-2">File: {fileName}</p>
      )}
      <p className="text-sm text-gray-400 mb-3">
        We recommend checking the security scan results before downloading any
        files.
      </p>
      <Link
        href={virusTotalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm transition-colors"
      >
        View VirusTotal Report
      </Link>
    </div>
  );
};

export default VirusTotalWidget;
