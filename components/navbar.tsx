import Link from "next/link";

import { CreditsBadge } from "@/components/auth/credits-badge";
import { AuthButton } from "@/components/auth-button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">TrustDoc</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link
              href="/"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Accueil
            </Link>
            <Link
              href="/docs"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Documentation
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <CreditsBadge />
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
