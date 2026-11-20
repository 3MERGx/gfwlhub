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
  fill?: boolean;
}

export default function GameImage({
  src,
  alt,
  width = 300,
  height = 400,
  className = "",
  priority = false,
  fill = false,
}: GameImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageSrc = useImageSrc(src);

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [imageSrc]);

  useEffect(() => {
    if (!imageSrc) return;

    const timer = setTimeout(() => {
      if (!imageLoaded) {
        setImageError(true);
      }
    }, fill ? 15000 : 5000);

    return () => clearTimeout(timer);
  }, [imageSrc, imageLoaded, fill]);

  if (imageError || !imageSrc) {
    if (fill) {
      return (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center bg-[rgb(var(--bg-card-alt))] px-3 text-center ${className}`}
        >
          <p className="text-[rgb(var(--text-secondary))] text-sm font-medium">
            No Image Available
          </p>
          <p className="text-[rgb(var(--text-muted))] text-xs mt-1">
            Help us add one!
          </p>
        </div>
      );
    }

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
          <p className="text-[rgb(var(--text-secondary))] text-sm font-medium">
            No Image Available
          </p>
          <p className="text-[rgb(var(--text-muted))] text-xs mt-1">
            Help us add one!
          </p>
        </div>
      </div>
    );
  }

  const isProxyUrl =
    typeof imageSrc === "string" && imageSrc.startsWith("/api/image-proxy");
  const isRemoteUrl =
    typeof imageSrc === "string" && imageSrc.startsWith("http");
  const useNativeImg = isProxyUrl || isRemoteUrl;

  const handleError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  if (useNativeImg) {
    if (fill) {
      return (
        <img
          src={imageSrc}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover ${className}`}
          loading={priority ? "eager" : "lazy"}
          onError={handleError}
          onLoad={handleLoad}
        />
      );
    }

    return (
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? "eager" : "lazy"}
        onError={handleError}
        onLoad={handleLoad}
        style={{ width, height, objectFit: "cover" }}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className={`object-cover ${className}`}
        priority={priority}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        onError={handleError}
        onLoad={handleLoad}
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
      onError={handleError}
      onLoad={handleLoad}
    />
  );
}
