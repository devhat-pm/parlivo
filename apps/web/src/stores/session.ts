import type { DevLoginResponse } from "@parlivo/schemas";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { devLogin } from "@/lib/api";

interface SessionState {
  accessToken: string | null;
  user: DevLoginResponse["user"] | null;
  setSession: (session: DevLoginResponse) => void;
  clear: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (session) => set({ accessToken: session.accessToken, user: session.user }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    { name: "parlivo-session", storage: createJSONStorage(() => sessionStorage) },
  ),
);

/**
 * Phase 0 has no real sign-in: get an access token from the dev-only login endpoint.
 * A fresh token is fetched each time because access tokens live 15 minutes and there is no
 * refresh flow yet.
 */
export async function ensureDevSession(): Promise<string> {
  const session = await devLogin();
  useSession.getState().setSession(session);
  return session.accessToken;
}
