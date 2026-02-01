"use client";

import { useState, ReactNode, useEffect, useRef } from "react";
import { FaCopy, FaDownload, FaCheck, FaExclamationTriangle } from "react-icons/fa";

interface DownloadButtonWithModalProps {
  downloadLink: string;
  fileName: string; // For the 'download' attribute of the <a> tag
  buttonText: string;
  modalTitle: string;
  modalContent: ReactNode; // Can be string or JSX for more complex content
  className?: string; // Optional additional classes for the button
}

export default function DownloadButtonWithModal({
  downloadLink,
  fileName,
  buttonText,
  modalTitle,
  modalContent,
  className = "inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors",
}: DownloadButtonWithModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") handleCloseModal();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isModalOpen]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setUrlCopied(false);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(downloadLink);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      setUrlCopied(false);
    }
  };

  const handleConfirmDownload = () => {
    if (typeof window !== "undefined") {
      const link = document.createElement("a");
      link.href = downloadLink;
      link.setAttribute("download", fileName || "download");
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    handleCloseModal();
  };

  const displayFileName = fileName || downloadLink.split("/").pop() || "file";
  const isExternalLink = /^https?:\/\//i.test(downloadLink);
  // Strip redundant "Download " from title when section already says "You are about to download"
  const displayTitle = buttonText.replace(/^download\s+/i, "").trim() || buttonText;
  // Only show filename line when it adds information (avoid duplicate when same as title)
  const showFileName = displayFileName.trim() !== displayTitle.trim();

  return (
    <>
      <button onClick={handleOpenModal} className={className}>
        <FaDownload className="mr-2" />
        {buttonText}
      </button>

      {isModalOpen && isMounted && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 transition-opacity duration-300 ease-in-out"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-download-target modal-disclaimer"
          onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
        >
          <div
            ref={modalRef}
            className="relative bg-[rgb(var(--bg-card))] rounded-lg shadow-xl max-w-lg w-full mx-3 sm:mx-6 max-h-[90vh] flex flex-col border border-[rgb(var(--border-color))] border-t-4 border-t-[#107c10] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-[rgb(var(--border-color))] rounded-t-lg shrink-0">
              <h3
                className="text-lg sm:text-xl font-semibold text-[rgb(var(--text-primary))] flex items-start gap-2 min-w-0"
                id="modal-title"
              >
                <FaExclamationTriangle
                  className="text-amber-500 flex-shrink-0 mt-0.5"
                  size={22}
                  aria-hidden
                />
                <span className="break-words">{modalTitle}</span>
              </h3>
              <button
                type="button"
                className="text-[rgb(var(--text-secondary))] bg-transparent hover:bg-[rgb(var(--bg-card-alt))] hover:text-[rgb(var(--text-primary))] rounded-lg text-sm p-2 sm:p-1.5 ml-auto inline-flex items-center focus:ring-2 focus:ring-[#107c10]/50 focus:outline-none transition-colors shrink-0 touch-manipulation"
                onClick={handleCloseModal}
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body - scrollable on small screens */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto min-h-0 flex-1 overscroll-contain">
              {/* Download target - visual of what user is about to download */}
              <div
                id="modal-download-target"
                className="rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] p-3 sm:p-4"
                aria-label="Download target"
              >
                <p className="text-xs font-medium text-[rgb(var(--text-secondary))] tracking-wide mb-2">
                  You are about to download
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#107c10]/15 flex items-center justify-center">
                    <FaDownload className="text-[#107c10]" size={20} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[rgb(var(--text-primary))] font-medium truncate" title={buttonText}>
                      {displayTitle}
                    </p>
                    {showFileName && (
                      <p className="text-sm text-[rgb(var(--text-secondary))] font-mono truncate" title={displayFileName}>
                        {displayFileName}
                      </p>
                    )}
                  </div>
                </div>
                {isExternalLink && (
                  <div className="mt-3 pt-3 border-t border-[rgb(var(--border-color))]">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
                      <p className="text-xs font-medium text-[rgb(var(--text-secondary))] tracking-wide">
                        Download URL
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="flex items-center justify-center gap-1.5 rounded-md px-3 py-2 sm:py-1 text-xs font-medium text-[rgb(var(--text-primary))] bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] hover:bg-[rgb(var(--bg-card-alt))] focus:ring-2 focus:ring-[#107c10]/50 focus:outline-none transition-colors shrink-0 touch-manipulation min-h-[44px] sm:min-h-0 w-full sm:w-auto"
                        aria-label={urlCopied ? "Copied" : "Copy download URL"}
                        title={urlCopied ? "Copied" : "Copy URL"}
                      >
                        {urlCopied ? (
                          <>
                            <FaCheck className="text-[#107c10]" size={12} aria-hidden />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <FaCopy size={12} aria-hidden />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p
                      className="text-xs font-mono text-[rgb(var(--text-primary))] break-all rounded bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] px-2 py-1.5"
                      title={downloadLink}
                    >
                      {downloadLink}
                    </p>
                  </div>
                )}
              </div>

              {/* Disclaimer content */}
              <div id="modal-disclaimer" className="mt-4 pt-4 border-t border-[rgb(var(--border-color))]">
                <p className="text-xs font-medium text-[rgb(var(--text-secondary))] tracking-wide mb-3">
                  Before you proceed
                </p>
                {typeof modalContent === "string" ? (
                  <div className="text-sm text-[rgb(var(--text-primary))] leading-relaxed space-y-3">
                    {modalContent
                      .split(/\n\n+/)
                      .filter(Boolean)
                      .map((paragraph, i) => (
                        <p key={i} className="first:mt-0">
                          {paragraph.trim()}
                        </p>
                      ))}
                  </div>
                ) : (
                  <div className="text-sm text-[rgb(var(--text-primary))] whitespace-pre-line leading-relaxed">
                    {modalContent}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer - stacked on mobile for touch targets */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end p-4 sm:p-6 border-t border-[rgb(var(--border-color))] rounded-b-lg bg-[rgb(var(--bg-card))] shrink-0">
              <button
                onClick={handleCloseModal}
                type="button"
                className="w-full sm:w-auto text-[rgb(var(--text-primary))] bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] focus:ring-4 focus:outline-none focus:ring-[rgb(var(--border-color))] font-medium rounded-lg text-sm px-5 py-3 sm:py-2.5 text-center transition-colors border border-[rgb(var(--border-color))] touch-manipulation min-h-[44px] sm:min-h-0"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDownload}
                type="button"
                className="w-full sm:w-auto text-white bg-[#107c10] hover:bg-[#0d6b0d] focus:ring-4 focus:outline-none focus:ring-[#107c10]/50 font-medium rounded-lg text-sm px-5 py-3 sm:py-2.5 text-center transition-colors touch-manipulation min-h-[44px] sm:min-h-0"
              >
                Accept & Continue to Download
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
