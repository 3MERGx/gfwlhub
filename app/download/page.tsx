"use client";

import { useState, useRef, useEffect } from "react";
import { FaInfoCircle, FaShieldAlt, FaTimes } from "react-icons/fa";
import Link from "next/link";
import VirusTotalWidget from "@/components/VirusTotalWidget";
import DownloadButtonWithModal from "@/components/DownloadButtonWithModal";

const BYPASS_VERSION = "1.0.0";
const PRODUCT_NAME = "GFWL Legacy 5x5 Bypass";
const DOWNLOAD_LINK = "/downloads/GFWL_Keygen.exe";
const KEYGEN_FILE_NAME = "GFWL_Keygen.exe";
const VIRUSTOTAL_URL =
  "https://www.virustotal.com/gui/url/43a8a467be25687021273864c669910ddce7f2d8ba7e348df2bb7e5688fe52cf/detection";
const DOTNET_RUNTIME_URL =
  "https://builds.dotnet.microsoft.com/dotnet/WindowsDesktop/6.0.36/windowsdesktop-runtime-6.0.36-win-x86.exe";
const DISCLAIMER_MODAL_TITLE = "Important Notice Regarding Downloads";
const DISCLAIMER_MODAL_CONTENT = `You are downloading files from third-party, external sources. While GFWL Hub may scan links using tools such as VirusTotal, we do not host, control, or guarantee the safety of any files linked through our platform. GFWL Hub makes no warranties—express or implied—regarding the safety, reliability, or performance of these files.

By proceeding, you acknowledge and accept that all downloads are done at your own risk. GFWL Hub is not responsible for any harm to your device, data loss, or other consequences resulting from the use of downloaded files. We strongly advise keeping your antivirus software up-to-date and exercising caution.`;

const DOWNLOAD_BUTTON_CLASSNAME =
  "inline-flex items-center bg-[#107c10] hover:bg-[#0d6b0d] text-white px-6 py-3 text-base font-medium rounded-md transition-colors focus:ring-4 focus:outline-none focus:ring-[#107c10]/50";

export default function Download() {
  const [showRegistryModal, setShowRegistryModal] = useState(false);
  const registryModalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (showRegistryModal) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const firstFocusable = registryModalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [showRegistryModal]);

  useEffect(() => {
    if (!showRegistryModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowRegistryModal(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showRegistryModal]);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[rgb(var(--bg-card))] p-5 md:p-8 rounded-lg shadow-xl mb-8 border border-[rgb(var(--border-color))]">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center text-[rgb(var(--text-primary))]">
            Download {PRODUCT_NAME}
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-center mb-4 text-sm md:text-base">
            For legacy 5x5 GFWL titles only ·{" "}
            <span className="font-medium text-[rgb(var(--text-primary))]">
              Latest Version: {BYPASS_VERSION}
            </span>
          </p>

          <div className="bg-[rgb(var(--bg-card-alt))] p-4 md:p-6 rounded-lg mb-6 border border-[rgb(var(--border-color))] border-t-4 border-t-[#107c10]">
            <h2 className="text-xl md:text-2xl font-bold mb-3 text-[rgb(var(--text-primary))]">
              Latest Version
            </h2>
            <p className="text-[rgb(var(--text-secondary))] mb-6 text-sm md:text-base">
              The tool allows you to bypass game activation for legacy 5x5 GFWL
              titles so you can continue playing compatible games.
            </p>

            <div className="flex justify-center">
              <DownloadButtonWithModal
                downloadLink={DOWNLOAD_LINK}
                fileName={KEYGEN_FILE_NAME}
                buttonText={`Download ${PRODUCT_NAME}`}
                modalTitle={DISCLAIMER_MODAL_TITLE}
                modalContent={DISCLAIMER_MODAL_CONTENT}
                className={DOWNLOAD_BUTTON_CLASSNAME}
              />
            </div>
          </div>

          <hr className="border-[rgb(var(--border-color))] my-6" aria-hidden="true" />

          <div className="bg-[rgb(var(--bg-card-alt))] p-4 md:p-6 rounded-lg mb-6 border border-[rgb(var(--border-color))]">
            <h2 className="text-lg md:text-xl font-bold mb-4 text-[rgb(var(--text-primary))]">
              Installation Instructions
            </h2>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-[#107c10]/20 shadow-sm">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-[rgb(var(--text-primary))] text-sm md:text-base">
                    Download and install the{" "}
                    <Link
                      href={DOTNET_RUNTIME_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#107c10] hover:underline font-medium"
                      aria-label="Download .NET 6.0 Desktop Runtime, x86 direct download (opens in new tab)"
                    >
                      .NET 6.0 Desktop Runtime
                    </Link>. This is required for the {PRODUCT_NAME} to run.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-[#107c10]/20 shadow-sm">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-[rgb(var(--text-primary))] text-sm md:text-base">
                    Download the latest version of the {PRODUCT_NAME} tool using the
                    button above.
                  </p>
                </div>
              </div>

              {/* Step 3 - Registry Backup */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-[#107c10]/20 shadow-sm">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-[rgb(var(--text-primary))] text-sm md:text-base mb-2">
                    <strong className="text-[rgb(var(--text-primary))]">Recommended:</strong> Back up
                    your existing PCID before running the keygen.
                  </p>
                  <button
                    onClick={() => setShowRegistryModal(true)}
                    type="button"
                    className="inline-flex items-center rounded-full border-2 border-[#107c10] bg-transparent px-3 py-1.5 text-sm font-medium text-[#107c10] transition-colors hover:bg-[#107c10]/10 focus:ring-2 focus:ring-[#107c10]/50 focus:outline-none"
                    aria-label="Open instructions for backing up your PCID"
                  >
                    How to backup PCID →
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-[#107c10]/20 shadow-sm">
                  4
                </div>
                <div className="flex-1">
                  <p className="text-[rgb(var(--text-primary))] text-sm md:text-base">
                    Run the application (
                    <code className="rounded bg-[rgb(var(--bg-card))] px-1.5 py-0.5 font-mono text-sm text-[#107c10] border border-[rgb(var(--border-color))]">
                      GFWL_Keygen.exe
                    </code>
                    ).
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-[#107c10]/20 shadow-sm">
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
                <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-[#107c10]/20 shadow-sm">
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

            {/* Warning Box - theme-aware */}
            <div className="mt-4 p-4 rounded-lg border border-[rgb(var(--border-color))] border-l-4 border-l-amber-500 bg-[rgb(var(--bg-card))]">
              <div className="flex items-start">
                <FaInfoCircle className="text-amber-500 mr-3 mt-1 flex-shrink-0" size={20} />
                <div>
                  <h4 className="text-[rgb(var(--text-primary))] font-medium mb-1">
                    Important Note
                  </h4>
                  <p className="text-[rgb(var(--text-secondary))] text-sm">
                    Some antivirus software may flag the tool as suspicious.
                    This is a false positive due to the way the tool interacts
                    with system files. You may need to add an exception in your
                    antivirus software.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-lg md:text-xl font-semibold mb-2 text-[rgb(var(--text-primary))] flex items-center gap-2">
              <FaShieldAlt className="text-[#107c10]" size={20} aria-hidden />
              Security Scan
            </h3>
            <p className="text-[rgb(var(--text-secondary))] text-sm mb-3">
              We link to a VirusTotal report below for transparency. VirusTotal
              is a third-party service that aggregates antivirus and other
              scan results.
            </p>
            <VirusTotalWidget virusTotalUrl={VIRUSTOTAL_URL} />
          </div>
        </div>
      </div>

      {/* Registry Backup Modal */}
      {showRegistryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 transition-opacity duration-300 ease-in-out"
          role="dialog"
          aria-modal="true"
          aria-labelledby="registry-modal-title"
          onClick={(e) => e.target === e.currentTarget && setShowRegistryModal(false)}
        >
          <div
            ref={registryModalRef}
            className="relative bg-[rgb(var(--bg-card))] rounded-lg shadow-xl max-w-2xl w-full mx-4 sm:mx-6 lg:mx-auto max-h-[90vh] flex flex-col border border-[rgb(var(--border-color))] border-t-4 border-t-[#107c10]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b border-[rgb(var(--border-color))] rounded-t-lg shrink-0">
              <h3
                className="text-xl font-semibold text-[rgb(var(--text-primary))] flex items-center"
                id="registry-modal-title"
              >
                <FaInfoCircle className="text-[#107c10] mr-3" size={24} aria-hidden />
                How to Backup Your PCID
              </h3>
              <button
                type="button"
                className="text-[rgb(var(--text-secondary))] bg-transparent hover:bg-[rgb(var(--bg-card-alt))] hover:text-[rgb(var(--text-primary))] rounded-lg text-sm p-1.5 ml-auto inline-flex items-center focus:ring-2 focus:ring-[#107c10]/50 focus:outline-none transition-colors"
                onClick={() => setShowRegistryModal(false)}
                aria-label="Close modal"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - scrollable on small screens */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] min-h-0">
              {/* Prerequisites */}
              <div>
                <h4 className="text-[rgb(var(--text-primary))] font-medium mb-3 flex items-center gap-2">
                  <FaInfoCircle className="text-[#107c10]" size={16} aria-hidden />
                  Prerequisites
                </h4>
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
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-[#107c10]/20 shadow-sm">
                      1
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[rgb(var(--text-primary))] text-sm">
                        Open Registry Editor by pressing{" "}
                        <code className="text-[#107c10] font-mono rounded border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] px-1.5 py-0.5 text-sm">
                          Win + R
                        </code>
                        , typing{" "}
                        <code className="text-[#107c10] font-mono rounded border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] px-1.5 py-0.5 text-sm">
                          regedit
                        </code>
                        , and pressing Enter.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-[#107c10]/20 shadow-sm">
                      2
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[rgb(var(--text-primary))] text-sm mb-2">
                        Navigate to this registry path:
                      </p>
                      <div className="rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] p-3">
                        <code className="text-[#107c10] text-sm font-mono break-all select-all">
                          HKEY_CURRENT_USER\Software\Classes\Software\Microsoft\XLive
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-[#107c10]/20 shadow-sm">
                      3
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[rgb(var(--text-primary))] text-sm">
                        Look for a value named{" "}
                        <code className="text-[#107c10] font-mono rounded border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] px-1.5 py-0.5 text-sm">
                          PCID
                        </code>{" "}
                        in the right panel.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-[#107c10]/20 shadow-sm">
                      4
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[rgb(var(--text-primary))] text-sm">
                        Double-click on{" "}
                        <code className="text-[#107c10] font-mono rounded border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] px-1.5 py-0.5 text-sm">
                          PCID
                        </code>{" "}
                        and copy the entire &quot;Value data&quot; string. Click
                        Ok.
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-[#107c10]/20 shadow-sm">
                      5
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[rgb(var(--text-primary))] text-sm">
                        Right-click in the right panel, hover over{" "}
                        <code className="text-[#107c10] font-mono rounded border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] px-1.5 py-0.5 text-sm">
                          New
                        </code>
                        , and select{" "}
                        <code className="text-[#107c10] font-mono rounded border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] px-1.5 py-0.5 text-sm">
                          QWORD (64-bit) Value
                        </code>
                        .
                      </p>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-[#107c10]/20 shadow-sm">
                      6
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[rgb(var(--text-primary))] text-sm">
                        Name the new value{" "}
                        <code className="text-[#107c10] font-mono rounded border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] px-1.5 py-0.5 text-sm">
                          PCID.old
                        </code>
                        .
                      </p>
                    </div>
                  </div>

                  {/* Step 7 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-[#107c10]/20 shadow-sm">
                      7
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[rgb(var(--text-primary))] text-sm">
                        Double-click{" "}
                        <code className="text-[#107c10] font-mono rounded border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] px-1.5 py-0.5 text-sm">
                          PCID.old
                        </code>
                        , ensure &quot;Base&quot; is set to{" "}
                        <code className="text-[#107c10] font-mono rounded border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] px-1.5 py-0.5 text-sm">
                          Hexadecimal
                        </code>
                        , paste your copied string into &quot;Value data&quot;,
                        and click OK.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Note - matches download page styling */}
              <div className="mt-4 p-4 rounded-lg border border-[rgb(var(--border-color))] border-l-4 border-l-amber-500 bg-[rgb(var(--bg-card))]">
                <div className="flex items-start">
                  <FaInfoCircle className="text-amber-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="text-[rgb(var(--text-primary))] font-medium mb-1">
                      Important Note
                    </h4>
                    <p className="text-[rgb(var(--text-secondary))] text-sm">
                      This backup allows you to manually restore your original
                      PCID, if desired.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 flex items-center justify-end p-6 border-t border-[rgb(var(--border-color))] rounded-b-lg bg-[rgb(var(--bg-card))]">
              <button
                onClick={() => setShowRegistryModal(false)}
                type="button"
                className="text-white bg-[#107c10] hover:bg-[#0d6b0d] focus:ring-4 focus:outline-none focus:ring-[#107c10]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors min-w-[6rem]"
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
