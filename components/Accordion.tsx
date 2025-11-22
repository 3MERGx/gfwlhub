"use client";

import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

interface AccordionProps {
  title: string;
  content: React.ReactNode;
  footer?: React.ReactNode; // Additional content to show at the bottom of expanded content
}

const Accordion = ({ title, content, footer }: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4 border border-[rgb(var(--border-color))] rounded-lg overflow-hidden">
      <button
        className="w-full p-4 text-left bg-gradient-to-r from-[#107c10] to-[#0e6b0e] hover:from-[#0e6b0e] hover:to-[#107c10] transition-colors flex justify-between items-center text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium text-lg">{title}</span>
        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
      </button>

      {isOpen && (
        <div className="bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))]">
          <div className="p-4">{content}</div>
          {footer && (
            <div className="px-4 pb-4 pt-2 border-t border-[rgb(var(--border-color))]">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Accordion;
