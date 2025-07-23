"use client";

import { FaInfoCircle } from "react-icons/fa";
import Link from "next/link";
import VirusTotalWidget from "@/components/VirusTotalWidget";
import DownloadButtonWithModal from "@/components/DownloadButtonWithModal";

export default function Download() {
  // Download link for GFWL Keygen - direct path to static file
  const downloadLink = "/downloads/GFWL_Keygen_Beta_0.5.exe";

  // VirusTotal URL for the file (update this after getting the direct link)
  const virusTotalUrl =
    "https://www.virustotal.com/gui/url/6cb4c0d7ce2d2e51cff381c74c7ac79e5ed03bcbfa14f448bd1d4d6e59d0553e";

  // Define the disclaimer content (can be the same as on the game page)
  const disclaimerModalTitle = "Important Notice Regarding Downloads";
  const disclaimerModalContent = `You are downloading files from third-party, external sources. While GFWL Hub may scan links using tools such as VirusTotal, we do not host, control, or guarantee the safety of any files linked through our platform. GFWL Hub makes no warranties—express or implied—regarding the safety, reliability, or performance of these files.

By proceeding, you acknowledge and accept that all downloads are done at your own risk. GFWL Hub is not responsible for any harm to your device, data loss, or other consequences resulting from the use of downloaded files. We strongly advise keeping your antivirus software up-to-date and exercising caution.`;

  // GFWL Keygen specific details
  const keygenFileName = "GFWL_Keygen_Beta_0.5.exe"; // Updated filename

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
              {/* GFWL Keygen Download - Using the Modal Button */}
              <DownloadButtonWithModal
                downloadLink={downloadLink}
                fileName={keygenFileName}
                buttonText="Download GFWL Keygen"
                modalTitle={disclaimerModalTitle}
                modalContent={disclaimerModalContent}
              />
            </div>
          </div>

          <div className="bg-[#2d2d2d] p-4 md:p-6 rounded-lg mb-6">
            <h2 className="text-lg md:text-xl font-bold mb-3 text-white">
              Installation Instructions
            </h2>
            <ol className="list-decimal list-inside space-y-2 md:space-y-3 text-gray-300 text-sm md:text-base pl-1">
              <li>
                Download and install the{" "}
                <Link
                  href="https://dotnet.microsoft.com/en-us/download/dotnet/thank-you/runtime-desktop-6.0.36-windows-x86-installer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#107c10] hover:underline"
                >
                  .NET 6.0 Desktop Runtime
                </Link>
                . This is required for the GFWL Keygen to run.
              </li>
              <li>Download the latest version of the GFWL Keygen tool.</li>
              <li>
                We recommend backing up your existing PCID before running the
                keygen. Check
              </li>
              <li>Run the application (GFWL_Keygen_Beta_0.5.exe).</li>
              <li>Follow the on-screen instructions to generate your key.</li>
              <li>Use the generated key to activate your GFWL game.</li>
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
            <VirusTotalWidget virusTotalUrl={virusTotalUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}
