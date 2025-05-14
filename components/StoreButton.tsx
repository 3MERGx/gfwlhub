import React from "react";

import Link from "next/link";
import { FaShoppingCart, FaSteam } from "react-icons/fa";
import { SiEpicgames, SiGogdotcom, SiUbisoft, SiOrigin } from "react-icons/si";

export interface StoreButtonProps {
  purchaseLink: string;
  className?: string;
}

const StoreButton: React.FC<StoreButtonProps> = ({
  purchaseLink,
  className = "",
}) => {
  let storeName = "Buy Game";
  let storeIcon = <FaShoppingCart className="mr-2" />;
  let buttonStyle = "bg-blue-600 hover:bg-blue-700"; // Default styling

  // Check for Steam
  if (purchaseLink.includes("steampowered.com")) {
    storeName = "Buy on Steam";
    storeIcon = <FaSteam className="mr-2" />;
    buttonStyle = "bg-[#1b2838] hover:bg-[#2a475e]"; // Steam colors
  }
  // Check for GOG
  else if (purchaseLink.includes("gog.com")) {
    storeName = "Buy on GOG";
    storeIcon = <SiGogdotcom className="mr-2" />;
    buttonStyle = "bg-[#5c1257] hover:bg-[#7b2977]"; // GOG colors
  }
  // Check for Epic
  else if (purchaseLink.includes("epicgames.com")) {
    storeName = "Buy on Epic";
    storeIcon = <SiEpicgames className="mr-2" />;
    buttonStyle = "bg-[#2f2f2f] hover:bg-[#444]"; // Epic colors
  }
  // Check for Ubisoft
  else if (
    purchaseLink.includes("ubisoft.com") ||
    purchaseLink.includes("ubi.com")
  ) {
    storeName = "Buy on Ubisoft";
    storeIcon = <SiUbisoft className="mr-2" />;
    buttonStyle = "bg-[#0050a5] hover:bg-[#015ebf]"; // Ubisoft colors
  }
  // Check for EA/Origin
  else if (
    purchaseLink.includes("ea.com") ||
    purchaseLink.includes("origin.com")
  ) {
    storeName = "Buy on EA";
    storeIcon = <SiOrigin className="mr-2" />;
    buttonStyle = "bg-[#f25e0d] hover:bg-[#ff7324]"; // EA colors
  }

  return (
    <Link
      href={purchaseLink}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center ${buttonStyle} text-white px-4 py-2 rounded-md transition-colors ${className}`}
    >
      {storeIcon}
      {storeName}
    </Link>
  );
};

export default StoreButton;
