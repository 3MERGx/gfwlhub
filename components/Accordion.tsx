"use client";

import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";

interface AccordionProps {
  title: string;
  content: React.ReactNode;
  footer?: React.ReactNode; // Additional content to show at the bottom of expanded content
  contentId?: string; // Optional id for content panel (enables aria-controls, role="region")
}

const Accordion = ({ title, content, footer, contentId }: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = contentId ? `${contentId}-title` : undefined;

  return (
    <div className="mb-4 rounded-xl border border-[rgb(var(--border-color))] overflow-hidden bg-[rgb(var(--bg-card))] shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
      <button
        type="button"
        className="w-full p-4 sm:p-5 text-left bg-gradient-to-r from-[#107c10] to-[#0e6b0e] hover:from-[#128c12] hover:to-[#107c10] active:from-[#0e6b0e] active:to-[#0c5c0c] transition-all duration-200 flex justify-between items-center gap-3 text-white focus:ring-2 focus:ring-[#107c10]/50 focus:ring-offset-2 focus:ring-offset-[rgb(var(--bg-card))] focus:outline-none min-h-[56px] sm:min-h-0"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        {...(contentId && { "aria-controls": contentId, "aria-labelledby": titleId })}
      >
        <span
          {...(titleId && { id: titleId })}
          className="font-semibold text-base sm:text-lg leading-snug flex-1 min-w-0 text-left"
        >
          {title}
        </span>
        <span
          className={`flex-shrink-0 flex items-center justify-center transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden
        >
          <FaChevronDown size={18} />
        </span>
      </button>

      {isOpen && (
        <div
          {...(contentId && { id: contentId, role: "region" as const, "aria-labelledby": titleId })}
          className="border-t border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))]/50"
        >
          <div className="p-4 sm:p-5 text-[rgb(var(--text-primary))] leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1">
            {content}
          </div>
          {footer && (
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card))]">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Accordion;
