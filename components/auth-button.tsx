"use client";

/**
 * Authentication Button Component
 *
 * Displays:
 * - Sign-in button when not authenticated
 * - User menu with credits and sign-out when authenticated
 *
 * Usage:
 * ```tsx
 * import { AuthButton } from "@/components/auth-button"
 *
 * <AuthButton />
 * ```
 */

import { LogOut, User, Coins } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AuthButton() {
  const { data: session, status } = useSession();

  // Loading state
  if (status === "loading") {
    return (
      <Button variant="ghost" disabled>
        <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
      </Button>
    );
  }

  // Not authenticated - show sign-in button
  if (!session?.user) {
    return (
      <Button asChild>
        <Link href="/auth/signin">Se connecter</Link>
      </Button>
    );
  }

  // Authenticated - show user menu
  const userInitial = session.user.name?.[0] || session.user.email?.[0] || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full"
          aria-label="Menu utilisateur"
        >
          <Avatar>
            <AvatarImage src={session.user.image || undefined} alt={session.user.name || ""} />
            <AvatarFallback className="bg-blue-600 text-white">
              {userInitial.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* User info */}
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{session.user.name || "Utilisateur"}</p>
            <p className="text-xs text-gray-500">{session.user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Credits */}
        <DropdownMenuItem asChild>
          <Link href="/credits" className="flex cursor-pointer items-center">
            <Coins className="mr-2 h-4 w-4" />
            <span>Mes crédits ({session.user.credits})</span>
          </Link>
        </DropdownMenuItem>

        {/* Dashboard */}
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex cursor-pointer items-center">
            <User className="mr-2 h-4 w-4" />
            <span>Mon profil</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign out */}
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Se déconnecter</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
