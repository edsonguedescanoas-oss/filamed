import { createStart } from "@tanstack/react-start";
import { securityHeadersMiddleware } from "@/middleware/security-headers";

/**
 * Entry de configuração do TanStack Start.
 * Registra middlewares globais aplicados a todas as requisições SSR/server-fn.
 */
export const startInstance = createStart(() => {
  return {
    requestMiddleware: [securityHeadersMiddleware],
  };
});
