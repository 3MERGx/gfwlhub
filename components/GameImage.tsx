"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

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
  const [imageLoaded, setImageLoaded] = useState(false);

  // Fallback: if image doesn't load within 5 seconds, show placeholder
  useEffect(() => {
    if (!src) return;
    
    const timer = setTimeout(() => {
      if (!imageLoaded) {
        setImageError(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [src, imageLoaded]);

  // Show placeholder if no image or error
  if (imageError || !src) {
    return (
      <div
        className={`relative flex items-center justify-center bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] rounded-lg shadow-lg ${className}`}
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
              <circle cx="30" cy="30" r="25" fill="rgb(var(--bg-card-alt))" />
              <path
                d="M20 30L30 20L40 30L30 40Z"
                fill="rgb(var(--text-muted))"
                opacity="0.5"
              />
            </svg>
          </div>
          <p className="text-[rgb(var(--text-secondary))] text-sm font-medium">No Image Available</p>
          <p className="text-[rgb(var(--text-muted))] text-xs mt-1">Help us add one!</p>
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
      onError={() => {
        setImageError(true);
        setImageLoaded(false);
      }}
      onLoad={() => {
        setImageLoaded(true);
        setImageError(false);
      }}
    />
  );
}

