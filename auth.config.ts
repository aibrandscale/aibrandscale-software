import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
  pages: {
    signIn: "/signin",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
        || nextUrl.pathname.startsWith("/brands")
        || nextUrl.pathname.startsWith("/products")
        || nextUrl.pathname.startsWith("/angles")
        || nextUrl.pathname.startsWith("/statics")
        || nextUrl.pathname.startsWith("/video-scripts")
        || nextUrl.pathname.startsWith("/advertorials")
        || nextUrl.pathname.startsWith("/team")
        || nextUrl.pathname.startsWith("/subscription")
        || nextUrl.pathname.startsWith("/support");
      const isOnAuthPage = nextUrl.pathname === "/signin"
        || nextUrl.pathname === "/signup";

      if (isOnDashboard) return isLoggedIn;
      if (isLoggedIn && isOnAuthPage) {
        return Response.redirect(new URL("/brands", nextUrl));
      }
      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }
      if (trigger === "update" && session?.activeWorkspaceId) {
        token.activeWorkspaceId = session.activeWorkspaceId;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      if (token.activeWorkspaceId) {
        session.activeWorkspaceId = token.activeWorkspaceId as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
