import { FaInfoCircle, FaExternalLinkAlt } from "react-icons/fa";
import Link from "next/link";
import DownloadButtonWithModal from "@/components/DownloadButtonWithModal";

interface CommunityAlternativeCardProps {
  communityAlternativeName: string;
  communityAlternativeUrl?: string;
  communityAlternativeDownloadLink?: string;
  fileName?: string;
}

export default function CommunityAlternativeCard({
  communityAlternativeName,
  communityAlternativeUrl,
  communityAlternativeDownloadLink,
  fileName,
}: CommunityAlternativeCardProps) {
  const disclaimerModalTitle = "Important Notice Regarding Downloads";
  const disclaimerModalContent = `You are downloading files from third-party, external sources. While GFWL Hub may scan links using tools such as VirusTotal, we do not host, control, or guarantee the safety of any files linked through our platform. GFWL Hub makes no warranties—express or implied—regarding the safety, reliability, or performance of these files.

By proceeding, you acknowledge and accept that all downloads are done at your own risk. GFWL Hub is not responsible for any harm to your device, data loss, or other consequences resulting from the use of downloaded files. We strongly advise keeping your antivirus software up-to-date and exercising caution.`;

  return (
    <div className="bg-green-100 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-500/40 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2 mb-3">
        <FaInfoCircle
          className="text-green-700 dark:text-green-400 flex-shrink-0 mt-0.5"
          size={16}
        />
        <p className="text-green-900 dark:text-green-200 text-sm font-medium flex-1">
          <span className="font-bold">Community alternative available:</span>{" "}
          <span className="font-semibold">{communityAlternativeName}</span>
        </p>
      </div>
      {(communityAlternativeUrl || communityAlternativeDownloadLink) && (
        <div className="flex flex-wrap gap-2 ml-6">
          {communityAlternativeUrl && (
            <Link
              href={communityAlternativeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md transition-colors text-sm font-medium"
            >
              <FaExternalLinkAlt size={12} />
              Visit {communityAlternativeName}
            </Link>
          )}
          {communityAlternativeDownloadLink && (
            <DownloadButtonWithModal
              downloadLink={communityAlternativeDownloadLink}
              fileName={fileName || "download"}
              buttonText="Download"
              modalTitle={disclaimerModalTitle}
              modalContent={disclaimerModalContent}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md transition-colors text-sm font-medium"
            />
          )}
        </div>
      )}
    </div>
  );
}
