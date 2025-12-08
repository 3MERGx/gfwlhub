"use client";

import Image from "next/image";
import { useState } from "react";

interface GameImageProps {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export default function GameImage({
  src,
  alt,
  width = 300,
  height = 400,
  className = "",
  priority = false,
}: GameImageProps) {
  const [imageError, setImageError] = useState(false);

  // Show placeholder if no image or error
  if (imageError || !src) {
    return (
      <div
        className={`relative flex items-center justify-center bg-[#1a1a1a] border border-[#2d2d2d] ${className}`}
        style={{ width, height }}
      >
        <div className="text-center p-4">
          <div className="mb-3">
            <svg
              width="60"
              height="60"
              viewBox="0 0 60 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto"
            >
              <circle cx="30" cy="30" r="25" fill="#2d2d2d" />
              <path
                d="M20 30L30 20L40 30L30 40Z"
                fill="#444"
                opacity="0.5"
              />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">No Image Available</p>
          <p className="text-gray-500 text-xs mt-1">Help us add one!</p>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      onError={() => setImageError(true)}
    />
  );
}

