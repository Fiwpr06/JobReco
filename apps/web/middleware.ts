import { withAuth } from "next-auth/middleware";

// We use withAuth to protect specific routes. 
// Unauthenticated users trying to access these routes will be redirected to the sign-in page.
export default withAuth({
  pages: {
    signIn: "/auth/login",
  },
});

export const config = {
  // Add all routes that require authentication here.
  matcher: [
    "/profile/:path*",
    "/cv/:path*",
    "/for-you/:path*",
    "/skills/:path*",
    "/upload/:path*",
    "/recruiter/:path*",
    "/applications/:path*",
  ],
};
