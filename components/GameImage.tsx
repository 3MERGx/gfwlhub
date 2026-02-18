"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";

/** Domains that block direct image requests (403) or rate-limit (429) and must be loaded via our proxy */
const PROXY_DOMAINS = [
  "thumbnails.pcgamingwiki.com",
  "images.pcgamingwiki.com",
  "www.pcgamingwiki.com",
  "pcgamingwiki.com",
  "upload.wikimedia.org",
  "wikimedia.org",
];

function useImageSrc(rawSrc: string | undefined): string | undefined {
  return useMemo(() => {
    if (!rawSrc || !rawSrc.startsWith("http")) return rawSrc;
    try {
      const host = new URL(rawSrc).hostname.toLowerCase();
      if (PROXY_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
        return `/api/image-proxy?url=${encodeURIComponent(rawSrc)}`;
      }
    } catch {
      // ignore invalid URLs
    }
    return rawSrc;
  }, [rawSrc]);
}

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
  const imageSrc = useImageSrc(src);

  // Fallback: if image doesn't load within 5 seconds, show placeholder
  useEffect(() => {
    if (!imageSrc) return;
    
    const timer = setTimeout(() => {
      if (!imageLoaded) {
        setImageError(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [imageSrc, imageLoaded]);

  // Show placeholder if no image or error
  if (imageError || !imageSrc) {
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

  // Use plain <img> for proxy URLs so the browser hits the proxy directly.
  // next/image with a relative proxy URL can mangle the query string and cause 400.
  const isProxyUrl =
    typeof imageSrc === "string" && imageSrc.startsWith("/api/image-proxy");

  if (isProxyUrl) {
    return (
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? "eager" : "lazy"}
        onError={() => {
          setImageError(true);
          setImageLoaded(false);
        }}
        onLoad={() => {
          setImageLoaded(true);
          setImageError(false);
        }}
        style={{ width, height, objectFit: "cover" }}
      />
    );
  }

  return (
    <Image
      src={imageSrc}
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

