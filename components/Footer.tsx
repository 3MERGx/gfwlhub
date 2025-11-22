import Link from "next/link";
import { FaDiscord, FaReddit, FaHeart } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] py-6 border-t border-[rgb(var(--border-color))]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p>© {new Date().getFullYear()} GFWL Hub. All rights reserved.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <p className="text-sm text-[rgb(var(--text-secondary))] text-center">
              Made with <FaHeart className="inline text-[#107c10]" /> by the
              community
            </p>
            <div className="flex items-center gap-4">
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
