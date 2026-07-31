export { auth as default, auth as proxy } from "@/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, robots.txt, line-icon.svg, BOT.png etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|logo-.*|line-.*|QR.*|BOT.*|.*\\.svg|.*\\.png|.*\\.ico).*)",
  ],
}

