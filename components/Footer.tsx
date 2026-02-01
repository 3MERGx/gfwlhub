import Link from "next/link";
import { FaDiscord, FaReddit } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] py-6 border-t border-[rgb(var(--border-color))]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p>© {new Date().getFullYear()} GFWL Hub. All rights reserved.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/download"
                className="text-[rgb(var(--text-primary))] hover:text-[#107c10] transition-colors font-medium"
              >
                GFWL Legacy Bypass
              </Link>
              <Link
                href="https://discord.gg/PR75T8xMWS"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[rgb(var(--text-primary))] hover:text-[#5865F2] transition-colors"
                aria-label="Discord"
              >
                <FaDiscord size={24} />
              </Link>
              <Link
                href="https://www.reddit.com/r/GFWLive/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[rgb(var(--text-primary))] hover:text-[#FF4500] transition-colors"
                aria-label="Reddit"
              >
                <FaReddit size={24} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
