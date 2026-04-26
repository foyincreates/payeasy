import { Github } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  Product: [
    { name: "Payment History", href: "/history" },
    { name: "Rent Builder", href: "/escrow/create" },
  ],
  Resources: [
    { name: "Stellar Docs", href: "https://developers.stellar.org" },
    { name: "Contributing", href: "https://github.com/Ogstevyn/payeasy/blob/main/CONTRIBUTING.md" },
  ],
  Community: [
    { name: "GitHub", href: "https://github.com/Ogstevyn/payeasy" },
  ],
};

export default function Footer() {
  return (
    <footer aria-label="Footer" className="border-t border-white/5 pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-lg font-bold text-white">
                Pay<span className="gradient-text">Easy</span>
              </span>
            </Link>
            <p className="text-dark-500 text-sm leading-relaxed mb-5 max-w-xs">
              Blockchain-powered rent sharing. Find roommates, split rent, pay
              through Stellar escrow.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Ogstevyn/payeasy"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg glass flex items-center justify-center text-dark-400 hover:text-white hover:border-brand-500/30 transition-all"
                aria-label="GitHub"
              >
                <Github size={16} />
              </a>
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="text-dark-500 hover:text-dark-300 transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-dark-600 text-xs">
            &copy; {new Date().getFullYear()} PayEasy. Open source under MIT License.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-dark-600 hover:text-dark-400 text-xs transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-dark-600 hover:text-dark-400 text-xs transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
