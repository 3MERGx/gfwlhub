interface DashboardErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export default function DashboardErrorBanner({
  message,
  onRetry,
}: DashboardErrorBannerProps) {
  return (
    <div
      className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-[rgb(var(--text-primary))] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      role="alert"
    >
      <p className="text-sm">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg text-sm transition-colors whitespace-nowrap"
        >
          Try again
        </button>
      )}
    </div>
  );
}
