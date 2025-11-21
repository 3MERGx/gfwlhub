import { FaInfoCircle } from "react-icons/fa";

interface CommunityAlternativeCardProps {
  communityAlternativeName: string;
}

export default function CommunityAlternativeCard({
  communityAlternativeName,
}: CommunityAlternativeCardProps) {
  return (
    <div className="bg-green-900/20 border border-green-500/40 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2">
        <FaInfoCircle className="text-green-400 flex-shrink-0" size={16} />
        <p className="text-green-200 text-sm">
          <span className="font-semibold">Community alternative available:</span> {communityAlternativeName}
        </p>
      </div>
    </div>
  );
}

