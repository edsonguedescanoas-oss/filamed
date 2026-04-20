import type { AppRole } from "@/hooks/use-auth";

/**
 * Mapa de telas (paths) que cada role pode acessar dentro de /app.
 * - admin: acesso total
 * - recepcao: gerencia pacientes, filas e gera senhas
 * - medico/enfermeiro: foco no atendimento clínico
 * - gestor: visão de gestão (filas + pacientes), sem operar atendimento
 */
export const ROLE_ROUTES: Record<AppRole, string[]> = {
  admin: ["/app", "/app/recepcao", "/app/atendimento", "/app/filas", "/app/pacientes", "/app/voz"],
  recepcao: ["/app", "/app/recepcao", "/app/filas", "/app/pacientes"],
  medico: ["/app", "/app/atendimento", "/app/pacientes"],
  enfermeiro: ["/app", "/app/atendimento", "/app/pacientes"],
  gestor: ["/app", "/app/filas", "/app/pacientes"],
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
