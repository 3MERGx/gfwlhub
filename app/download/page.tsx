"use client";

import { useState } from "react";
import { FaDownload, FaGithub, FaInfoCircle } from "react-icons/fa";
import VirusTotalWidget from "@/components/VirusTotalWidget";

export default function Download() {
  const [showTooltip1, setShowTooltip1] = useState(false);
  const [showTooltip2, setShowTooltip2] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#202020] p-8 rounded-lg shadow-xl mb-8">
          <h1 className="text-3xl font-bold mb-6 text-center text-white">
            Download GFWL Hub
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
              <div className="relative">
                <button
                  className="bg-gray-600 text-white px-6 py-3 rounded-md transition-colors inline-flex items-center cursor-not-allowed opacity-70"
                  onMouseEnter={() => setShowTooltip1(true)}
                  onMouseLeave={() => setShowTooltip1(false)}
                >
                  <FaDownload className="mr-2" />
                  Download Latest Version
                </button>
                {showTooltip1 && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-black text-white text-xs rounded py-1 px-2 z-10">
                    Download not available yet
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                  </div>
                )}
              </div>

              <div className="relative">
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
              </div>
            </div>
          </div>

          <div className="bg-[#2d2d2d] p-6 rounded-lg mb-8">
            <h2 className="text-xl font-bold mb-4 text-white">
              Installation Instructions
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-300">
              <li>Download the latest version of the GFWL Hub tool</li>
              <li>Extract the ZIP file to a location of your choice</li>
              <li>Run the installer as administrator</li>
              <li>
                Follow the on-screen instructions to complete the installation
              </li>
              <li>
                Launch your GFWL game and sign in with your Microsoft account
              </li>
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

          {/* VirusTotal Widget */}
          <div className="mt-6">
            <VirusTotalWidget scanId="" fileName="GFWLHub-Installer.exe" />
          </div>
        </div>
      </div>
    </div>
  );
}
