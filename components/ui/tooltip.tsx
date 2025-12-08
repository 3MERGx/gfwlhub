import React from "react";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

const Tooltip: React.FC<TooltipProps> = ({ 
  text, 
  children, 
  position = "top" 
}) => {
  const getPositionClasses = (pos: string) => {
    switch (pos) {
      case "top":
        return {
          tooltip: "bottom-full left-1/2 -translate-x-1/2 mb-2",
          arrow: "top-full left-1/2 -translate-x-1/2 border-t-gray-900",
        };
      case "bottom":
        return {
          tooltip: "top-full left-1/2 -translate-x-1/2 mt-2",
          arrow: "bottom-full left-1/2 -translate-x-1/2 border-b-gray-900",
        };
      case "left":
        return {
          tooltip: "right-full top-1/2 -translate-y-1/2 mr-2",
          arrow: "left-full top-1/2 -translate-y-1/2 border-l-gray-900",
        };
      case "right":
        return {
          tooltip: "left-full top-1/2 -translate-y-1/2 ml-2",
          arrow: "right-full top-1/2 -translate-y-1/2 border-r-gray-900",
        };
      default:
        return {
          tooltip: "bottom-full left-1/2 -translate-x-1/2 mb-2",
          arrow: "top-full left-1/2 -translate-x-1/2 border-t-gray-900",
        };
    }
  };

  const { tooltip, arrow } = getPositionClasses(position);

  return (
    <span className="group relative inline-flex items-center">
      {children}
      <span
        className={`absolute ${tooltip} px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-lg border border-gray-700 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-active:opacity-100 group-active:visible transition-all duration-200 pointer-events-none z-10`}
      >
        {text}
        <span
          className={`absolute ${arrow} border-4 border-transparent`}
        />
      </span>
    </span>
  );
};

export default Tooltip;
