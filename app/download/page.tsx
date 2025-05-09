"use client";

import { FaDownload, FaInfoCircle } from "react-icons/fa";
import Link from "next/link";
import VirusTotalWidget from "@/components/VirusTotalWidget";

export default function Download() {
  // Download link for GFWL Keygen
  const downloadLink =
    "https://cdn.discordapp.com/attachments/1065348198094352524/1363973667683307590/GFWL_Keygen_Beta_0.5.7z?ex=681f0d37&is=681dbbb7&hm=638e3cae8c799fcab96ec888f430e9f3db92977249e52210f78863065b6a2196&";

  // VirusTotal hash/URL for the file
  const virusTotalUrl =
    "6cb4c0d7ce2d2e51cff381c74c7ac79e5ed03bcbfa14f448bd1d4d6e59d0553e";

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#202020] p-5 md:p-8 rounded-lg shadow-xl mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center text-white">
            Download GFWL Keygen
          </h1>
          <p className="text-gray-300 text-center mb-4 text-sm md:text-base">
            Latest Version: Beta 0.5.7
          </p>

          <div className="bg-[#2d2d2d] p-4 md:p-6 rounded-lg mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-3 text-white">
              Latest Version
            </h2>
            <p className="text-gray-300 mb-6 text-sm md:text-base">
              Our tool provides a streamlined installation process for Games for
              Windows LIVE, with fixes for modern Windows versions and
              compatibility improvements.
            </p>

            <div className="flex justify-center">
              {/* Active download button */}
              <Link
                href={downloadLink}
                className="bg-[#107c10] hover:bg-[#0e6b0e] text-white w-full md:w-auto px-4 md:px-6 py-3 rounded-md transition-colors inline-flex items-center justify-center"
              >
                <FaDownload className="mr-2" />
                <span className="text-sm md:text-base">
                  Download GFWL Keygen (Beta 0.5.7)
                </span>
              </Link>
            </div>
          </div>

          <div className="bg-[#2d2d2d] p-4 md:p-6 rounded-lg mb-6">
            <h2 className="text-lg md:text-xl font-bold mb-3 text-white">
              Installation Instructions
            </h2>
            <ol className="list-decimal list-inside space-y-2 md:space-y-3 text-gray-300 text-sm md:text-base pl-1">
              <li>Download the latest version of the GFWL Keygen tool</li>
              <li>Extract the 7Z archive file to a location of your choice</li>
              <li>Run the application as administrator</li>
              <li>Follow the on-screen instructions to generate your key</li>
              <li>Use the generated key to activate your GFWL game</li>
            </ol>

            <div className="mt-5 p-3 md:p-4 bg-[#3d3d3d] rounded-lg flex items-start">
              <FaInfoCircle className="text-[#107c10] mr-2 md:mr-3 mt-1 flex-shrink-0" />
              <p className="text-gray-300 text-xs md:text-sm">
                <strong className="text-white">Note:</strong> Some antivirus
                software may flag the tool as suspicious. This is a false
                positive due to the way the tool interacts with system files.
                You may need to add an exception in your antivirus software.
              </p>
            </div>
          </div>

          {/* VirusTotal Widget with correct URL */}
          <div className="mt-5">
            <h3 className="text-lg md:text-xl font-semibold mb-2 text-white">
              Security Scan
            </h3>
            <VirusTotalWidget fileHash={virusTotalUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}
