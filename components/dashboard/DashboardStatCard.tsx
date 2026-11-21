import Link from "next/link";
import type { ReactNode } from "react";

interface DashboardStatCardProps {
  href?: string;
  title: string;
  value?: number;
  loaded: boolean;
  subtitle: string;
  icon: ReactNode;
  emphasize?: boolean;
}

function StatValue({ value, loaded }: { value?: number; loaded: boolean }) {
  if (!loaded) {
    return (
      <span
        className="inline-block h-6 w-10 rounded bg-[rgb(var(--bg-card-alt))] animate-pulse"
        aria-hidden
      />
    );
  }
  return <>{value ?? 0}</>;
}

export default function DashboardStatCard({
  href,
  title,
  value,
  loaded,
  subtitle,
  icon,
  emphasize = false,
}: DashboardStatCardProps) {
  const className = `dashboard-surface group relative block p-3 sm:p-4 ${
    href
      ? "hover:border-[rgb(var(--color-primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))]/30"
      : ""
  } ${emphasize ? "ring-1 ring-[rgb(var(--color-primary))]/25" : ""}`;

  const content = (
    <>
      {emphasize && (
        <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-[rgb(var(--color-primary))]" />
      )}
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="dashboard-label">{title}</h3>
        <span className="text-[rgb(var(--text-muted))] shrink-0">{icon}</span>
      </div>
      <p className="dashboard-stat-value text-xl sm:text-2xl md:text-3xl text-[rgb(var(--text-primary))]">
        <StatValue value={value} loaded={loaded} />
      </p>
      <p className="mt-1 text-xs text-[rgb(var(--text-secondary))] leading-snug line-clamp-2">
        {subtitle}
      </p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
