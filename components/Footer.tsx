import Link from "next/link";
import { FaDiscord, FaReddit } from "react-icons/fa";

const FOOTER_LINKS = [
  { href: "/supported-games", label: "Supported Games" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Game Communities" },
  { href: "/download", label: "5x5 Activation Bypass" },
] as const;

const linkClass =
  "text-sm text-[rgb(var(--text-secondary))] hover:text-[#107c10] transition-colors";

const sectionLabelClass =
  "mb-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]";

const Footer = () => {
  return (
    <footer className="bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] py-8 border-t border-[rgb(var(--border-color))]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          <div className="text-center md:text-left">
            <Link
              href="/"
              className="text-lg font-bold text-[rgb(var(--text-primary))] hover:text-[#107c10] transition-colors"
            >
              GFWL Hub
            </Link>
            <p className="mt-2 text-sm text-[rgb(var(--text-secondary))] leading-relaxed">
              Community resource for Games for Windows LIVE titles.
            </p>
          </div>

          <nav aria-label="Footer">
            <p className={`${sectionLabelClass} text-center md:text-left`}>
              Explore
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1 text-center md:text-left">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className={`${sectionLabelClass} text-center md:text-left`}>
              Community
            </p>
            <ul className="flex flex-col items-center gap-3 md:items-start">
              <li>
                <Link
                  href="https://discord.gg/PR75T8xMWS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 ${linkClass} hover:text-[#5865F2]`}
                >
                  <FaDiscord size={18} aria-hidden />
                  Discord
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.reddit.com/r/GFWLive/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 ${linkClass} hover:text-[#FF4500]`}
                >
                  <FaReddit size={18} aria-hidden />
                  Reddit
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-[rgb(var(--border-color))] pt-6 text-center md:text-left text-sm text-[rgb(var(--text-secondary))]">
          <p>© {new Date().getFullYear()} GFWL Hub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
