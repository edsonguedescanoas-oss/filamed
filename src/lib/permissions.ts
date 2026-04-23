import type { AppRole } from "@/hooks/use-auth";

/**
 * Mapa de telas (paths) que cada role pode acessar dentro de /app.
 * - admin: acesso total (incluindo /app/pontos para cadastro de pontos de atendimento)
 * - recepcao: pré-atendimento + guichê (chama, classifica e encaminha)
 * - medico/enfermeiro: foco no atendimento clínico
 * - gestor: visão de gestão (filas + pacientes + pontos), sem operar atendimento
 */
export const ROLE_ROUTES: Record<AppRole, string[]> = {
  admin: [
    "/app",
    "/app/recepcao",
    "/app/guiche",
    "/app/atendimento",
    "/app/filas",
    "/app/pacientes",
    "/app/pontos",
    "/app/voz",
    "/app/tv",
    "/app/notificacoes",
    "/app/relatorios",
    "/app/auditoria",
    "/app/usuarios",
  ],
  recepcao: ["/app", "/app/recepcao", "/app/guiche", "/app/filas", "/app/pacientes", "/app/notificacoes"],
  medico: ["/app", "/app/atendimento", "/app/pacientes"],
  enfermeiro: ["/app", "/app/atendimento", "/app/pacientes"],
  gestor: ["/app", "/app/filas", "/app/pontos", "/app/pacientes", "/app/notificacoes", "/app/relatorios", "/app/auditoria", "/app/usuarios"],
  super_admin: [], // super_admin opera em /admin, não em /app
};

/** Une todas as rotas permitidas para o conjunto de roles do usuário. */
export function allowedRoutesFor(roles: AppRole[]): Set<string> {
  const set = new Set<string>(["/app"]); // dashboard sempre liberado
  for (const r of roles) {
    for (const path of ROLE_ROUTES[r] ?? []) set.add(path);
  }
  return set;
}

/** Verifica se qualquer role do usuário libera a rota informada. */
export function canAccessRoute(roles: AppRole[], path: string): boolean {
  return allowedRoutesFor(roles).has(path);
}
