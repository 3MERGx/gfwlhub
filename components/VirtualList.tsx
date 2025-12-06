"use client";

import { useMemo, useRef, useState } from "react";

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  className?: string;
}

/**
 * Lightweight virtual scrolling component for large lists
 * Only renders visible items plus overscan buffer
 */
export default function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  className = "",
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);
    
    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(items.length, visibleEnd + overscan);
    
    const totalHeight = items.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    return { startIndex, endIndex, totalHeight, offsetY };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [items, startIndex, endIndex]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="list"
      aria-label={`List with ${items.length} items`}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{ height: itemHeight }}
              role="listitem"
              aria-posinset={index + 1}
              aria-setsize={items.length}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

