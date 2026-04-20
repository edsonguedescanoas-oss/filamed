/**
 * Auth store global para TanStack Router beforeLoad.
 *
 * Por quê existir? `beforeLoad` roda fora do React, então não pode ler
 * `useAuth()`. Aqui mantemos um snapshot síncrono carregado no boot do
 * router e atualizado via `onAuthStateChange`. O AuthProvider continua
 * sendo a fonte para a UI reativa — este store é a fonte para guards.
 */
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, UserProfile, TrialStatus } from "@/hooks/use-auth";

export interface AuthSnapshot {
  isAuthenticated: boolean;
  session: Session | null;
  profile: UserProfile | null;
  roles: AppRole[];
  trial: TrialStatus | null;
  /** True quando ainda não rodou loadInitialAuth (não bloqueamos UI nisso, só guards). */
  isLoading: boolean;
}

let snapshot: AuthSnapshot = {
  isAuthenticated: false,
  session: null,
  profile: null,
  roles: [],
  trial: null,
  isLoading: true,
};

type Listener = (s: AuthSnapshot) => void;
const listeners = new Set<Listener>();

export function getAuthSnapshot(): AuthSnapshot {
  return snapshot;
}

export function subscribeAuth(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setSnapshot(next: Partial<AuthSnapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const l of listeners) l(snapshot);
}

async function fetchProfileAndRoles(userId: string): Promise<{
  profile: UserProfile | null;
  roles: AppRole[];
  trial: TrialStatus | null;
}> {
  const [profileRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const profile = (profileRes.data as UserProfile | null) ?? null;
  const roles = ((rolesRes.data ?? []) as { role: AppRole }[]).map((r) => r.role);

  let trial: TrialStatus | null = null;
  if (profile?.unidade_id) {
    const { data: trialData } = await supabase.rpc("get_unidade_trial_status", {
      _unidade_id: profile.unidade_id,
    });
    trial = (trialData?.[0] as TrialStatus | undefined) ?? null;
  }

  return { profile, roles, trial };
}

let initialPromise: Promise<void> | null = null;
let listenerAttached = false;

/**
 * Garante que o snapshot está carregado antes do primeiro beforeLoad rodar.
 * Idempotente — chamadas subsequentes retornam a mesma promise.
 */
export function loadInitialAuth(): Promise<void> {
  if (initialPromise) return initialPromise;

  initialPromise = (async () => {
    // SSR: sem session, snapshot fica vazio (guards vão tratar como deslogado)
    if (typeof window === "undefined") {
      setSnapshot({ isLoading: false });
      return;
    }

    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (session?.user) {
      const { profile, roles } = await fetchProfileAndRoles(session.user.id);
      setSnapshot({
        isAuthenticated: true,
        session,
        profile,
        roles,
        isLoading: false,
      });
    } else {
      setSnapshot({ isLoading: false });
    }

    // Liga o listener uma única vez para manter o snapshot sincronizado
    if (!listenerAttached) {
      listenerAttached = true;
      supabase.auth.onAuthStateChange((_event, newSession) => {
        if (newSession?.user) {
          // Não bloqueia o callback — busca em segundo plano
          void fetchProfileAndRoles(newSession.user.id).then(({ profile, roles }) => {
            setSnapshot({
              isAuthenticated: true,
              session: newSession,
              profile,
              roles,
              isLoading: false,
            });
          });
        } else {
          setSnapshot({
            isAuthenticated: false,
            session: null,
            profile: null,
            roles: [],
            isLoading: false,
          });
        }
      });
    }
  })();

  return initialPromise;
}

/**
 * Forçar refresh do profile/roles (usado após setup_initial_unidade,
 * mudanças de role, etc). Mantém o session atual.
 */
export async function refreshAuthSnapshot(): Promise<void> {
  const userId = snapshot.session?.user?.id;
  if (!userId) return;
  const { profile, roles } = await fetchProfileAndRoles(userId);
  setSnapshot({ profile, roles });
}
