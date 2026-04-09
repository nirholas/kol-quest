import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.NEXT_PUBLIC_URL,
});

export const { signIn, signUp, useSession, signOut, getSession } = authClient;
