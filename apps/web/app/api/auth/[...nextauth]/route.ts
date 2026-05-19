import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const baseUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const res = await axios.post(
            `${baseUrl}/api/v1/auth/login`,
            {
              username: credentials?.username,
              password: credentials?.password,
            },
            {
              headers: { "Content-Type": "application/x-www-form-urlencoded" }
            }
          );

          const token = res.data.access_token;
          
          if (token) {
            // Ideally backend should return user profile here, but let's mock the user object
            // to satisfy NextAuth type, and store the JWT.
            return {
              id: "1",
              name: credentials?.username,
              email: credentials?.username,
              accessToken: token
            } as any;
          }
          return null;
        } catch (e) {
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        // In a real app, add token rotation logic here
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt'
  },
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith('https'),
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_development_only",
  cookies: {
    sessionToken: {
      name: process.env.NEXTAUTH_URL?.startsWith('https') ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https')
      }
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
