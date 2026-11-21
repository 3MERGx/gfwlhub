"use client";

import { memo, useCallback, useState } from "react";
import Image from "next/image";
import { getAvatarUrl } from "@/lib/image-utils";

interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

function UserAvatar({
  name,
  src,
  size = 40,
  className = "",
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const url = src ? getAvatarUrl(src) : null;
  const showImage = Boolean(url) && !failed;
  const initial = (name.trim().charAt(0) || "?").toUpperCase();

  const handleError = useCallback(() => {
    setFailed(true);
  }, []);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#107c10] to-[#0d6b0d] font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.38) }}
      aria-hidden
    >
      <span className="select-none leading-none">{initial}</span>
      {showImage && url ? (
        <Image
          src={url}
          alt=""
          width={size}
          height={size}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          unoptimized
          onError={handleError}
        />
      ) : null}
    </span>
  );
}

export default memo(UserAvatar);
