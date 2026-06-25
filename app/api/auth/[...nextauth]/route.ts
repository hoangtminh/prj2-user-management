import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Declare typescript definitions inline for NextAuth session properties
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Exchange Google ID Token with backend API
      if (account?.id_token) {
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://optimind-server.onrender.com";
          const res = await fetch(`${apiBaseUrl}/api/auth/google`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ idToken: account.id_token }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.token) {
              token.accessToken = data.token.accessToken;
              token.refreshToken = data.token.refreshToken;
            }
          } else {
            console.error("Failed to exchange Google token on Spring Boot backend:", res.status);
          }
        } catch (err) {
          console.error("Error exchanging token with backend:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
