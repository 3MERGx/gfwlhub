"use client";

import { useMemo } from "react";
import Link from "next/link";
import InlineUrlSafetyIndicator from "./InlineUrlSafetyIndicator";

interface TextWithLinksProps {
  text: string;
  className?: string;
}

/**
 * Component that renders text with clickable links and URL safety indicators
 * Detects URLs in text and converts them to clickable links
 */
// URL regex pattern - matches http://, https://, www., and common TLDs
const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;

export default function TextWithLinks({ text, className = "" }: TextWithLinksProps) {
  const parts = useMemo(() => {
    const parts: Array<{ type: "text" | "url"; content: string }> = [];
    let lastIndex = 0;
    let match;

    // Reset regex lastIndex
    urlRegex.lastIndex = 0;

    while ((match = urlRegex.exec(text)) !== null) {
      // Add text before the URL
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.substring(lastIndex, match.index),
        });
      }

      // Add the URL
      let url = match[0];
      // Add https:// if it starts with www.
      if (url.startsWith("www.")) {
        url = "https://" + url;
      }
      parts.push({
        type: "url",
        content: url,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex),
      });
    }

    // If no URLs found, return the whole text as a single part
    if (parts.length === 0) {
      parts.push({
        type: "text",
        content: text,
      });
    }

    return parts;
  }, [text]);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === "url") {
          return (
            <span key={index} className="inline-flex items-center gap-1 flex-wrap">
              <Link
                href={part.content}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#107c10] hover:text-[#0d6b0d] underline break-all"
              >
                {part.content}
              </Link>
              <InlineUrlSafetyIndicator url={part.content} />
            </span>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </span>
  );
}

