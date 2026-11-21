import Link from "next/link";
import { FaDiscord, FaReddit } from "react-icons/fa";

const FOOTER_LINKS = [
  { href: "/supported-games", label: "Supported Games" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Game Communities" },
  { href: "/download", label: "5x5 Activation Bypass" },
] as const;

const Footer = () => {
  return (
    <footer className="bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] py-8 border-t border-[rgb(var(--border-color))]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-6">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[rgb(var(--text-secondary))] hover:text-[#107c10] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left text-sm text-[rgb(var(--text-secondary))]">
              <p>© {new Date().getFullYear()} GFWL Hub. All rights reserved.</p>
            </div>
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
