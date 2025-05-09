"use client";

import { FaDownload, FaInfoCircle } from "react-icons/fa";
import VirusTotalWidget from "@/components/VirusTotalWidget";
import Link from "next/link";

export default function Download() {
  const downloadLink =
    "https://cdn.discordapp.com/attachments/1065348198094352524/1363973667683307590/GFWL_Keygen_Beta_0.5.7z?ex=681f0d37&is=681dbbb7&hm=638e3cae8c799fcab96ec888f430e9f3db92977249e52210f78863065b6a2196&";

  // VirusTotal hash/URL for the file
  const virusTotalHash =
    "2b5365394ceb1706f208490058153f9f07eeea6b83759349355ba0bc891d456a";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#202020] p-8 rounded-lg shadow-xl mb-8">
          <h1 className="text-3xl font-bold mb-6 text-center text-white">
            Download GFWL Keygen (Beta 0.5.7)
          </h1>

          <div className="bg-[#2d2d2d] p-6 rounded-lg mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">
              Latest Version
            </h2>
            <p className="text-gray-300 mb-6">
              Our tool provides a streamlined installation process for Games for
              Windows LIVE, with fixes for modern Windows versions and
              compatibility improvements.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Active download button */}
              <Link
                href={downloadLink}
                className="bg-[#107c10] hover:bg-[#0e6b0e] text-white px-6 py-3 rounded-md transition-colors inline-flex items-center"
              >
                <FaDownload className="mr-2" />
                Download GFWL Keygen (Beta 0.5.7)
              </Link>

              {/* GitHub button - still disabled */}
              {/* <div className="relative">
                <button
                  className="bg-gray-600 text-white px-6 py-3 rounded-md transition-colors inline-flex items-center cursor-not-allowed opacity-70"
                  onMouseEnter={() => setShowTooltip2(true)}
                  onMouseLeave={() => setShowTooltip2(false)}
                >
                  <FaGithub className="mr-2" />
                  View Source on GitHub
                </button>
                {showTooltip2 && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-black text-white text-xs rounded py-1 px-2 z-10">
                    GitHub repository coming soon
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                  </div>
                )}
              </div> */}
            </div>
          </div>

          <div className="bg-[#2d2d2d] p-6 rounded-lg mb-8">
            <h2 className="text-xl font-bold mb-4 text-white">
              Installation Instructions
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-300">
              <li>Download the latest version of the GFWL Keygen tool</li>
              <li>Extract the 7Z archive file to a location of your choice</li>
              <li>Run the application as administrator</li>
              <li>Follow the on-screen instructions to generate your key</li>
              <li>Use the generated key to activate your GFWL game</li>
            </ol>

            <div className="mt-6 p-4 bg-[#3d3d3d] rounded-lg flex items-start">
              <FaInfoCircle className="text-[#107c10] mr-3 mt-1 flex-shrink-0" />
              <p className="text-gray-300 text-sm">
                <strong className="text-white">Note:</strong> Some antivirus
                software may flag the tool as suspicious. This is a false
                positive due to the way the tool interacts with system files.
                You may need to add an exception in your antivirus software.
              </p>
            </div>
          </div>

          {/* VirusTotal Widget with correct URL */}
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-2 text-white">
              Security Scan
            </h3>

            <VirusTotalWidget fileHash={virusTotalHash} />
          </div>
        </div>
      </div>
    </div>
  );
}
