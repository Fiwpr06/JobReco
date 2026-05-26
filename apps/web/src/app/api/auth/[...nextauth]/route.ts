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
            try {
              const profileRes = await axios.get(`${baseUrl}/api/v1/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              const profile = profileRes.data;

              return {
                id: profile.id?.toString(),
                name: profile.full_name,
                email: profile.email,
                role: profile.role,
                subscription_tier: profile.subscription_tier,
                premium_until: profile.premium_until,
                company_id: profile.company_id,
                accessToken: token
              } as any;
            } catch (err) {
              console.error("Failed to fetch user profile", err);
              return null;
            }
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
        token.role = (user as any).role;
        token.subscription_tier = (user as any).subscription_tier;
        token.premium_until = (user as any).premium_until;
        token.company_id = (user as any).company_id;
        token.id = user.id;
        // In a real app, add token rotation logic here
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).subscription_tier = token.subscription_tier;
        (session.user as any).premium_until = token.premium_until;
        (session.user as any).company_id = token.company_id;
        (session.user as any).id = token.id;
      }
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
  secret: process.env.NEXTAUTH_SECRET,
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
