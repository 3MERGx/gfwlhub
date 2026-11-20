import type {
  ActivationType,
  PlayabilityStatus,
  SupportStatus,
} from "@/data/games";

const ACTIVATION_STYLES: Record<ActivationType, string> = {
  "Legacy (5x5)":
    "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-500/40",
  "Legacy (Per-Title)":
    "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-500/40",
  SSA: "bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-500/40",
};

const STATUS_STYLES: Record<SupportStatus, string> = {
  supported:
    "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-500/40",
  testing:
    "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-500/40",
  unsupported:
    "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-500/40",
};

const PLAYABILITY_STYLES: Record<PlayabilityStatus, string> = {
  playable:
    "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-500/40",
  unplayable:
    "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-500/40",
  community_alternative:
    "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-500/40",
  remastered_available:
    "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-500/40",
};

const PLAYABILITY_LABELS: Record<PlayabilityStatus, string> = {
  playable: "Playable",
  unplayable: "Unplayable",
  community_alternative: "Community Alternative",
  remastered_available: "Remastered Available",
};

const STATUS_LABELS: Record<SupportStatus, string> = {
  supported: "Supported",
  testing: "Testing",
  unsupported: "Unsupported",
};

const BASE_BADGE =
  "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border";

interface ActivationBadgeProps {
  type: ActivationType;
  className?: string;
}

export function ActivationBadge({ type, className = "" }: ActivationBadgeProps) {
  return (
    <span className={`${BASE_BADGE} ${ACTIVATION_STYLES[type]} ${className}`}>
      {type}
    </span>
  );
}

interface StatusBadgeProps {
  status: SupportStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span className={`${BASE_BADGE} ${STATUS_STYLES[status]} ${className}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

interface PlayabilityBadgeProps {
  status: PlayabilityStatus;
  className?: string;
}

export function PlayabilityBadge({
  status,
  className = "",
}: PlayabilityBadgeProps) {
  return (
    <span
      className={`${BASE_BADGE} ${PLAYABILITY_STYLES[status]} ${className}`}
    >
      {PLAYABILITY_LABELS[status]}
    </span>
  );
}

export const ACTIVATION_FILTERS: {
  value: ActivationType;
  label: string;
  description: string;
}[] = [
  {
    value: "Legacy (5x5)",
    label: "Legacy (5x5)",
    description:
      "Uses the 5x5 activation system and is supported by the bypass tool.",
  },
  {
    value: "Legacy (Per-Title)",
    label: "Legacy (Per-Title)",
    description:
      "Uses per-title activation and may still be in testing.",
  },
  {
    value: "SSA",
    label: "SSA",
    description:
      "Server Side Activation titles that are currently unsupported.",
  },
];

export const STATUS_FILTERS: {
  value: SupportStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "supported",
    label: "Supported",
    description: "Game has working community support guidance.",
  },
  {
    value: "testing",
    label: "Testing",
    description: "Fix is being verified and may be incomplete.",
  },
  {
    value: "unsupported",
    label: "Unsupported",
    description: "No working fix is available yet.",
  },
];
