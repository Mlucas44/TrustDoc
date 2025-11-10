"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CreditsBadge } from "@/components/auth/credits-badge";
import { AuthButton } from "@/components/auth-button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2" aria-label="Accueil TrustDoc">
            <span className="text-xl font-bold">TrustDoc</span>
          </Link>
          <nav
            className="hidden md:flex items-center gap-6 text-sm"
            aria-label="Navigation principale"
          >
            <Link
              href="/history"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
              aria-current={pathname === "/history" ? "page" : undefined}
            >
              Mes analyses
            </Link>
            <Link
              href="/credits"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
              aria-current={pathname === "/credits" ? "page" : undefined}
            >
              Crédits
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
