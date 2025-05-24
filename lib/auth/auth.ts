import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { JWT } from "next-auth/jwt";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  accessToken?: string;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const { email, password } = loginSchema.parse(credentials);

          // Mock successful login for demo purposes
          // In production, replace with actual API call
          const mockUser = {
            id: "123e4567-e89b-12d3-a456-426614174000",
            email: "affulisaac@gmail.com",
            first_name: "Isaac",
            last_name: "Afful",
            role: "ADMIN",
            access_token: process.env.NEXT_PUBLIC_MOCK_ACCESS_TOKEN,
          };

          return {
            id: mockUser.id,
            email: mockUser.email,
            name: `${mockUser.first_name} ${mockUser.last_name}`,
            role: mockUser.role,
            accessToken: mockUser.access_token,
          };
        } catch (error) {
          console.error(error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: User | null }) {
      if (user) {
        return {
          ...token,
          id: user.id,
          role: user.role,
          accessToken: user.accessToken,
        };
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
          accessToken: token.accessToken,
        },
      };
    },
  },
}; 