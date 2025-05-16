"use client";

import { useState, ReactNode } from "react";
import { FaDownload, FaExclamationTriangle } from "react-icons/fa";

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

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleConfirmDownload = () => {
    // Programmatically trigger the download
    const link = document.createElement("a");
    link.href = downloadLink;
    link.setAttribute("download", fileName || "download"); // Set filename for download
    link.setAttribute("target", "_blank"); // Optional: open in new tab if direct download isn't forced
    link.setAttribute("rel", "noopener noreferrer");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    handleCloseModal();
  };

  return (
    <>
      <button onClick={handleOpenModal} className={className}>
        <FaDownload className="mr-2" />
        {buttonText}
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity duration-300 ease-in-out"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative bg-[#2d2d2d] rounded-lg shadow-xl max-w-lg w-full mx-4 sm:mx-6 lg:mx-auto transform transition-all duration-300 ease-in-out scale-100">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 border-b border-gray-600 rounded-t">
              <h3
                className="text-xl font-semibold text-white flex items-center"
                id="modal-title"
              >
                <FaExclamationTriangle
                  className="text-yellow-400 mr-3"
                  size={24}
                />
                {modalTitle}
              </h3>
              <button
                type="button"
                className="text-gray-400 bg-transparent hover:bg-gray-600 hover:text-white rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                onClick={handleCloseModal}
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                {modalContent}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-6 space-x-3 border-t border-gray-600 rounded-b">
              <button
                onClick={handleCloseModal}
                type="button"
                className="text-white bg-gray-500 hover:bg-gray-600 focus:ring-4 focus:outline-none focus:ring-gray-700 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDownload}
                type="button"
                className="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors"
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
