import React from "react";
import { FaShieldAlt, FaExternalLinkAlt } from "react-icons/fa";

interface VirusTotalWidgetProps {
  scanId: string;
  fileName: string;
  detectionRatio?: string;
  scanDate?: string;
}

const VirusTotalWidget: React.FC<VirusTotalWidgetProps> = ({
  scanId,
  fileName,
  detectionRatio = "0/70",
  scanDate = "Not yet scanned",
}) => {
  const vtUrl = scanId
    ? `https://www.virustotal.com/gui/file/${scanId}/detection`
    : "https://www.virustotal.com";

  return (
    <div className="bg-[#2d2d2d] p-6 rounded-lg border border-gray-700">
      <div className="flex items-center mb-4">
        <FaShieldAlt className="text-[#107c10] mr-3 text-xl" />
        <h3 className="text-xl font-bold text-white">
          VirusTotal Scan Results
        </h3>
      </div>

      {scanId ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <div className="text-gray-400">File:</div>
            <div className="text-white font-medium">{fileName}</div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <div className="text-gray-400">Detection:</div>
            <div className="text-white font-medium">{detectionRatio}</div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <div className="text-gray-400">Last Scanned:</div>
            <div className="text-white font-medium">{scanDate}</div>
          </div>
          <div className="mt-4">
            <a
              href={vtUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-[#107c10] hover:bg-[#0e6b0e] text-white px-4 py-2 rounded-md transition-colors"
            >
              View Full Report <FaExternalLinkAlt className="ml-2" size={14} />
            </a>
          </div>
        </div>
      ) : (
        <div className="text-gray-300">
          <p>
            VirusTotal scan results will be available once the GFWL Hub tool is
            released.
          </p>
          <p className="mt-2 text-sm">
            We&apos;ll submit our tool to VirusTotal to ensure transparency and
            security.
          </p>
        </div>
      )}
    </div>
  );
};

export default VirusTotalWidget;
