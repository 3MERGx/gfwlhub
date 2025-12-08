import type { PlayabilityStatus } from "@/data/games";

interface PlayabilityBadgeProps {
  status: PlayabilityStatus;
}

export default function PlayabilityBadge({ status }: PlayabilityBadgeProps) {
  const getBadgeStyles = () => {
    switch (status) {
      case "playable":
        return "bg-green-900/30 text-green-400 border-green-500/30";
      case "unplayable":
        return "bg-red-900/30 text-red-400 border-red-500/30";
      case "community_alternative":
        return "bg-green-900/30 text-green-400 border-green-500/30";
      case "remastered_available":
        return "bg-blue-900/30 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-700/30 text-gray-400 border-gray-600/30";
    }
  };

  const getLabel = () => {
    switch (status) {
      case "playable":
        return "Playable";
      case "unplayable":
        return "Unplayable";
      case "community_alternative":
        return "Community Alternative";
      case "remastered_available":
        return "Remastered Available";
      default:
        return "Unknown";
    }
  };

  return (
    <span
      className={`px-3 py-1.5 rounded-md text-xs font-medium border ${getBadgeStyles()}`}
    >
      {getLabel()}
    </span>
  );
}
