import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  getAuthSnapshot,
  subscribeAuth,
  refreshAuthSnapshot,
  loadInitialAuth,
} from "@/lib/auth-store";

export type AppRole = "admin" | "recepcao" | "medico" | "enfermeiro" | "gestor";

export interface UserProfile {
  id: string;
  nome_completo: string;
  telefone: string | null;
  unidade_id: string | null;
  avatar_url: string | null;
  ativo: boolean;
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nomeCompleto: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Provider fino sobre o auth-store global. A fonte da verdade é o store;
 * aqui só refletimos o snapshot em estado React para componentes.
 *
 * Por que não duplicar fetches? Porque o router já chama loadInitialAuth()
 * em beforeLoad da raiz e mantém um listener sincronizando com onAuthStateChange.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState(() => getAuthSnapshot());

  useEffect(() => {
    // Garante o boot caso o router ainda não tenha disparado (ex: testes)
    void loadInitialAuth();
    return subscribeAuth(setSnap);
  }, []);

  const value: AuthState = {
    isLoading: snap.isLoading,
    isAuthenticated: snap.isAuthenticated,
    session: snap.session,
    user: snap.session?.user ?? null,
    profile: snap.profile,
    roles: snap.roles,
    hasRole: (role) => snap.roles.includes(role),
    hasAnyRole: (rs) => rs.some((r) => snap.roles.includes(r)),
    refreshProfile: refreshAuthSnapshot,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (email, password, nomeCompleto) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: { nome_completo: nomeCompleto },
        },
      });
      if (error) throw error;
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
