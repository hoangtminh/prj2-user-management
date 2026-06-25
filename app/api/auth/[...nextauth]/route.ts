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
      if (account?.id_token) {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://optimind-server.onrender.com";
        const exchangeUrl = `${apiBaseUrl}/api/auth/google`;
        console.log(`[NextAuth JWT Callback] Initiating Token Exchange...`);
        console.log(`[NextAuth JWT Callback] Target Server URL: ${exchangeUrl}`);
        
        try {
          const res = await fetch(exchangeUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ idToken: account.id_token }),
          });

          if (res.ok) {
            const data = await res.json();
            console.log(`[NextAuth JWT Callback] Token exchange successful! Response keys:`, Object.keys(data));
            if (data?.token) {
              token.accessToken = data.token.accessToken;
              token.refreshToken = data.token.refreshToken;
              console.log(`[NextAuth JWT Callback] Successfully assigned accessToken and refreshToken to NextAuth token.`);
            } else {
              console.warn(`[NextAuth JWT Callback] Response OK but 'token' object is missing in body:`, data);
            }
          } else {
            const errorText = await res.text();
            console.error(`[NextAuth JWT Callback] Server returned error status: ${res.status}. Body:`, errorText);
          }
        } catch (err) {
          console.error(`[NextAuth JWT Callback] Failed to fetch server endpoint:`, err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      console.log(`[NextAuth Session Callback] Mapping token properties to session. AccessToken present:`, !!token.accessToken);
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
