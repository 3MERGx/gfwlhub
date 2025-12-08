"use client";

import { useState } from "react";
import { FaInfoCircle, FaTimes } from "react-icons/fa";
import Link from "next/link";
import VirusTotalWidget from "@/components/VirusTotalWidget";
import DownloadButtonWithModal from "@/components/DownloadButtonWithModal";

export default function Download() {
  const [showRegistryModal, setShowRegistryModal] = useState(false);

  // Download link for GFWL Keygen - direct path to static file
  const downloadLink = "/downloads/GFWL_Keygen.exe";

  // VirusTotal URL for the file (update this after getting the direct link)
  const virusTotalUrl =
    "https://www.virustotal.com/gui/url/43a8a467be25687021273864c669910ddce7f2d8ba7e348df2bb7e5688fe52cf/detection";

  // Define the disclaimer content (can be the same as on the game page)
  const disclaimerModalTitle = "Important Notice Regarding Downloads";
  const disclaimerModalContent = `You are downloading files from third-party, external sources. While GFWL Hub may scan links using tools such as VirusTotal, we do not host, control, or guarantee the safety of any files linked through our platform. GFWL Hub makes no warranties—express or implied—regarding the safety, reliability, or performance of these files.

By proceeding, you acknowledge and accept that all downloads are done at your own risk. GFWL Hub is not responsible for any harm to your device, data loss, or other consequences resulting from the use of downloaded files. We strongly advise keeping your antivirus software up-to-date and exercising caution.`;

  // GFWL Keygen specific details
  const keygenFileName = "GFWL_Keygen.exe"; // Updated filename

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[rgb(var(--bg-card))] p-5 md:p-8 rounded-lg shadow-xl mb-8 border border-[rgb(var(--border-color))]">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center text-[rgb(var(--text-primary))]">
            Download GFWL Keygen
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-center mb-4 text-sm md:text-base">
            Latest Version: 1.0.0
          </p>

          <div className="bg-[rgb(var(--bg-card-alt))] p-4 md:p-6 rounded-lg mb-6 border border-[rgb(var(--border-color))]">
            <h2 className="text-xl md:text-2xl font-bold mb-3 text-[rgb(var(--text-primary))]">
              Latest Version
            </h2>
            <p className="text-[rgb(var(--text-secondary))] mb-6 text-sm md:text-base">
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

          <div className="bg-[rgb(var(--bg-card-alt))] p-4 md:p-6 rounded-lg mb-6 border border-[rgb(var(--border-color))]">
            <h2 className="text-lg md:text-xl font-bold mb-4 text-[rgb(var(--text-primary))]">
              Installation Instructions
            </h2>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-[rgb(var(--text-primary))] text-sm md:text-base">
                    Download and install the{" "}
                    <Link
                      href="https://dotnet.microsoft.com/en-us/download/dotnet/thank-you/runtime-desktop-6.0.36-windows-x86-installer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#107c10] hover:underline font-medium"
                    >
                      .NET 6.0 Desktop Runtime
                    </Link>
                    . This is required for the GFWL Keygen to run.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-[rgb(var(--text-primary))] text-sm md:text-base">
                    Download the latest version of the GFWL Keygen tool using
                    the button above.
                  </p>
                </div>
              </div>

              {/* Step 3 - Registry Backup */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-[rgb(var(--text-primary))] text-sm md:text-base mb-2">
                    <strong className="text-[rgb(var(--text-primary))]">Recommended:</strong> Back up
                    your existing PCID before running the keygen.
                  </p>
                  {/* <div className="bg-[#1a1a1a] border border-[#404040] rounded-lg p-3 mb-2">
                    <p className="text-xs text-gray-400 mb-1 font-medium">
                      Registry Path:
                    </p>
                    <code className="text-[#107c10] text-xs md:text-sm font-mono break-all">
                      HKEY_CURRENT_USER\Software\Classes\Software\Microsoft\XLive
                    </code>
                  </div> */}
                  <button
                    onClick={() => setShowRegistryModal(true)}
                    className="text-[#107c10] hover:text-[#0d6b0d] text-xs font-medium underline transition-colors"
                  >
                    How to backup PCID →
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div className="flex-1">
                  <p className="text-[rgb(var(--text-primary))] text-sm md:text-base">
                    Run the application (
                    <code className="text-[#107c10] font-mono">
                      GFWL_Keygen.exe
                    </code>
                    ).
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  5
                </div>
                <div className="flex-1">
                  <p className="text-[rgb(var(--text-primary))] text-sm md:text-base">
                    The keygen should automatically activate Legacy 5x5 and
                    Legacy (Per Title) games.
                  </p>
                </div>
              </div>

              {/* Step 6 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  6
                </div>
                <div className="flex-1">
                  <p className="text-[rgb(var(--text-primary))] text-sm md:text-base">
                    If activation fails, the key should be pre-filled. Simply
                    click &quot;Next&quot; to proceed.
                  </p>
                </div>
              </div>
            </div>

            {/* Warning Box */}
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg">
              <div className="flex items-start">
                <FaInfoCircle className="text-yellow-600 dark:text-yellow-500 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="text-yellow-800 dark:text-yellow-300 font-medium mb-1">
                    Important Note
                  </h4>
                  <p className="text-yellow-700 dark:text-yellow-200 text-sm">
                    Some antivirus software may flag the tool as suspicious.
                    This is a false positive due to the way the tool interacts
                    with system files. You may need to add an exception in your
                    antivirus software.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* VirusTotal Widget with correct URL */}
          <div className="mt-5">
            <h3 className="text-lg md:text-xl font-semibold mb-2 text-[rgb(var(--text-primary))]">
              Security Scan
            </h3>
            <VirusTotalWidget virusTotalUrl={virusTotalUrl} />
          </div>
        </div>
      </div>

      {/* Registry Backup Modal */}
      {showRegistryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 transition-opacity duration-300 ease-in-out">
          <div className="relative bg-[rgb(var(--bg-card))] rounded-lg shadow-xl max-w-2xl w-full mx-4 sm:mx-6 lg:mx-auto transform transition-all duration-300 ease-in-out scale-100 border border-[rgb(var(--border-color))]">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-[rgb(var(--border-color))] rounded-t">
              <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] flex items-center">
                <FaInfoCircle className="text-[#107c10] mr-3" size={24} />
                How to Backup Your PCID
              </h3>
              <button
                type="button"
                className="text-[rgb(var(--text-secondary))] bg-transparent hover:bg-[rgb(var(--bg-card-alt))] hover:text-[rgb(var(--text-primary))] rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                onClick={() => setShowRegistryModal(false)}
                aria-label="Close modal"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Prerequisites */}
              <div>
                <h4 className="text-[rgb(var(--text-primary))] font-medium mb-3">Prerequisites</h4>
                <div className="bg-[rgb(var(--bg-card-alt))] border border-[rgb(var(--border-color))] rounded-lg p-4">
                  <p className="text-[rgb(var(--text-primary))] text-sm mb-2">
                    <strong className="text-[rgb(var(--text-primary))]">Note:</strong> If you&apos;ve
                    never launched any GFWL game before on your current PC, you
                    won&apos;t have a PCID to backup.
                  </p>
                  <p className="text-[rgb(var(--text-primary))] text-sm">
                    In this case, you can skip this step and proceed directly to
                    running the keygen.
                  </p>
                </div>
              </div>

              {/* Step-by-step instructions */}
              <div>
                <h4 className="text-[rgb(var(--text-primary))] font-medium mt-4 mb-3">
                  Backup Instructions
                </h4>
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-[rgb(var(--text-primary))] text-sm">
                        Open Registry Editor by pressing{" "}
                        <code className="text-[#107c10] font-mono bg-[rgb(var(--bg-card-alt))] px-1 rounded">
                          Win + R
                        </code>
                        , typing{" "}
                        <code className="text-[#107c10] font-mono bg-[rgb(var(--bg-card-alt))] px-1 rounded">
                          regedit
                        </code>
                        , and pressing Enter.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-[rgb(var(--text-primary))] text-sm mb-2">
                        Navigate to this registry path:
                      </p>
                      <div className="bg-[rgb(var(--bg-card-alt))] border border-[rgb(var(--border-color))] rounded-lg p-3">
                        <code className="text-[#107c10] text-sm font-mono break-all">
                          HKEY_CURRENT_USER\Software\Classes\Software\Microsoft\XLive
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-[rgb(var(--text-primary))] text-sm">
                        Look for a value named{" "}
                        <code className="text-[#107c10] font-mono bg-[rgb(var(--bg-card-alt))] px-1 rounded">
                          PCID
                        </code>{" "}
                        in the right panel.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                      4
                    </div>
                    <div className="flex-1">
                      <p className="text-[rgb(var(--text-primary))] text-sm">
                        Double-click on{" "}
                        <code className="text-[#107c10] font-mono bg-[rgb(var(--bg-card-alt))] px-1 rounded">
                          PCID
                        </code>{" "}
                        and copy the entire &quot;Value data&quot; string. Click
                        Ok.
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                      5
                    </div>
                    <div className="flex-1">
                      <p className="text-[rgb(var(--text-primary))] text-sm">
                        Right-click in the right panel, hover over{" "}
                        <code className="text-[#107c10] font-mono bg-[rgb(var(--bg-card-alt))] px-1 rounded">
                          New
                        </code>
                        , and select{" "}
                        <code className="text-[#107c10] font-mono bg-[rgb(var(--bg-card-alt))] px-1 rounded">
                          QWORD (64-bit) Value
                        </code>
                        .
                      </p>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                      6
                    </div>
                    <div className="flex-1">
                      <p className="text-[rgb(var(--text-primary))] text-sm">
                        Name the new value{" "}
                        <code className="text-[#107c10] font-mono bg-[rgb(var(--bg-card-alt))] px-1 rounded">
                          PCID.old
                        </code>
                        .
                      </p>
                    </div>
                  </div>

                  {/* Step 7 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                      7
                    </div>
                    <div className="flex-1">
                      <p className="text-[rgb(var(--text-primary))] text-sm">
                        Double-click{" "}
                        <code className="text-[#107c10] font-mono bg-[rgb(var(--bg-card-alt))] px-1 rounded">
                          PCID.old
                        </code>
                        , ensure &quot;Base&quot; is set to{" "}
                        <code className="text-[#107c10] font-mono bg-[rgb(var(--bg-card-alt))] px-1 rounded">
                          Hexadecimal
                        </code>
                        , paste your copied string into &quot;Value data&quot;,
                        and click OK.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-500/30 mt-4 rounded-lg p-4">
                <div className="flex items-start">
                  <FaInfoCircle className="text-yellow-600 dark:text-yellow-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h5 className="text-yellow-800 dark:text-yellow-400 font-medium mb-1">
                      Important
                    </h5>
                    <p className="text-yellow-700 dark:text-yellow-200 text-sm">
                      This backup allows you to manually restore your original
                      PCID, if desired.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-6 border-t border-[rgb(var(--border-color))] rounded-b">
              <button
                onClick={() => setShowRegistryModal(false)}
                type="button"
                className="text-white bg-[#107c10] hover:bg-[#0d6b0d] focus:ring-4 focus:outline-none focus:ring-[#107c10]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
