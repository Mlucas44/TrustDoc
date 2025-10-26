/**
 * NextAuth Middleware
 *
 * Protects routes that require authentication.
 *
 * Protected routes:
 * - /dashboard/* - User dashboard and analyses
 * - /api/analyze - Document analysis endpoint
 *
 * Public routes:
 * - / - Homepage
 * - /auth/* - Authentication pages
 * - /api/auth/* - NextAuth endpoints
 * - /api/health - Health check
 */

export { auth as middleware } from "@/src/auth";

/**
 * Matcher configuration
 *
 * Specifies which routes should be processed by the middleware.
 * Routes NOT matched will bypass authentication checks.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
