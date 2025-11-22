"use client";

import { FaRocket, FaTimes, FaExclamationTriangle, FaCheck, FaTimes as FaTimesIcon } from "react-icons/fa";

interface RequiredFields {
  title: boolean;
  releaseDate: boolean;
  developer: boolean;
  publisher: boolean;
}

interface ConfirmPublishModalProps {
  gameTitle: string;
  requiredFields?: RequiredFields;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmPublishModal({
  gameTitle,
  requiredFields,
  onConfirm,
  onCancel,
}: ConfirmPublishModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-[rgb(var(--bg-card))] rounded-lg max-w-md w-full border border-[rgb(var(--border-color))] animate-fade-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#107c10]/20 flex items-center justify-center">
              <FaRocket className="text-[#107c10]" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[rgb(var(--text-primary))] mb-1">
                Publish Game
              </h2>
              <p className="text-[rgb(var(--text-secondary))] text-sm">{gameTitle}</p>
            </div>
            <button
              onClick={onCancel}
              className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4 mb-6">
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <FaExclamationTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-yellow-300 text-sm">
                    Are you sure you want to publish <strong>{gameTitle}</strong>?
                  </p>
                  <p className="text-yellow-300/80 text-xs mt-2">
                    This will make the game visible to all users on the platform.
                  </p>
                </div>
              </div>
            </div>

            {/* Required Fields Checklist */}
            {requiredFields && (
              <div className="bg-[rgb(var(--bg-card-alt))] border border-[rgb(var(--border-color))] rounded-lg p-4">
                <p className="text-[rgb(var(--text-secondary))] text-xs font-semibold mb-3">Required Fields:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {requiredFields.title ? (
                      <FaCheck className="text-green-400 flex-shrink-0" size={12} />
                    ) : (
                      <FaTimesIcon className="text-red-400 flex-shrink-0" size={12} />
                    )}
                    <span className={`text-xs ${requiredFields.title ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))]'}`}>
                      Title
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {requiredFields.releaseDate ? (
                      <FaCheck className="text-green-400 flex-shrink-0" size={12} />
                    ) : (
                      <FaTimesIcon className="text-red-400 flex-shrink-0" size={12} />
                    )}
                    <span className={`text-xs ${requiredFields.releaseDate ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))]'}`}>
                      Release Date
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {requiredFields.developer ? (
                      <FaCheck className="text-green-400 flex-shrink-0" size={12} />
                    ) : (
                      <FaTimesIcon className="text-red-400 flex-shrink-0" size={12} />
                    )}
                    <span className={`text-xs ${requiredFields.developer ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))]'}`}>
                      Developer
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {requiredFields.publisher ? (
                      <FaCheck className="text-green-400 flex-shrink-0" size={12} />
                    ) : (
                      <FaTimesIcon className="text-red-400 flex-shrink-0" size={12} />
                    )}
                    <span className={`text-xs ${requiredFields.publisher ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))]'}`}>
                      Publisher
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm border border-[rgb(var(--border-color))]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-[#107c10] hover:bg-[#0e6b0e] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              <FaRocket />
              Publish Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

