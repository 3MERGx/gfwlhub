"use client";

import { useState } from "react";
import {
  FaExclamationTriangle,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

interface ExpandableDisclaimerProps {
  title: string;
  content: string;
}

export default function ExpandableDisclaimer({
  title,
  content,
}: ExpandableDisclaimerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleDisclaimer = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-yellow-900 border-l-4 border-yellow-500 rounded-md mb-6">
      <button
        onClick={toggleDisclaimer}
        className="w-full flex items-center justify-between p-4 text-left text-yellow-100 hover:bg-yellow-800 focus:outline-none"
        aria-expanded={isExpanded}
        aria-controls="disclaimer-content-body"
      >
        <div className="flex items-center">
          <FaExclamationTriangle
            className="text-yellow-400 mr-3 flex-shrink-0"
            size={20}
          />
          <span className="font-bold text-yellow-200">{title}</span>
        </div>
        {isExpanded ? (
          <FaChevronUp className="text-yellow-400" size={18} />
        ) : (
          <FaChevronDown className="text-yellow-400" size={18} />
        )}
      </button>
      {isExpanded && (
        <div
          id="disclaimer-content-body"
          className="p-4 border-t border-yellow-700"
        >
          <p className="text-sm text-yellow-100 whitespace-pre-line">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}
