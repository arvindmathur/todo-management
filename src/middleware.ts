import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect dashboard routes
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token
        }
        
        // Protect API routes (except auth routes)
        if (req.nextUrl.pathname.startsWith("/api") && 
            !req.nextUrl.pathname.startsWith("/api/auth")) {
          return !!token
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/user/:path*",
    "/api/tasks/:path*",
    "/api/projects/:path*",
    "/api/contexts/:path*",
    "/api/areas/:path*",
    "/api/inbox/:path*",
  ]
}