"use client";

import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

interface AccordionProps {
  title: string;
  content: React.ReactNode;
}

const Accordion = ({ title, content }: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4 border border-gray-700 rounded-lg overflow-hidden">
      <button
        className="w-full p-4 text-left bg-gradient-to-r from-[#107c10] to-[#0e6b0e] hover:from-[#0e6b0e] hover:to-[#107c10] transition-colors flex justify-between items-center text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium text-lg">{title}</span>
        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
      </button>

      {isOpen && <div className="p-4 bg-[#202020] text-white">{content}</div>}
    </div>
  );
};

export default Accordion;
