"use client";

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
  height?: string;
  width?: string;
}

export function LoadingSkeleton({
  className = "",
  count = 1,
  height = "h-4",
  width = "w-full",
}: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-[rgb(var(--bg-card-alt))] rounded ${height} ${width} ${className}`}
        />
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[rgb(var(--bg-card))] rounded-lg p-6 border border-[rgb(var(--border-color))]">
      <LoadingSkeleton height="h-6" width="w-3/4" className="mb-4" />
      <LoadingSkeleton height="h-4" width="w-full" className="mb-2" />
      <LoadingSkeleton height="h-4" width="w-5/6" className="mb-4" />
      <div className="flex gap-2">
        <LoadingSkeleton height="h-8" width="w-24" />
        <LoadingSkeleton height="h-8" width="w-24" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 mb-4 pb-2 border-b border-[rgb(var(--border-color))]">
        {Array.from({ length: cols }).map((_, i) => (
          <LoadingSkeleton key={i} height="h-4" width="w-24" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 mb-3">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <LoadingSkeleton key={colIndex} height="h-4" width="w-24" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

