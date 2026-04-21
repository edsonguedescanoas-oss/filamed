import { createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

/**
 * Middleware global de segurança HTTP.
 *
 * Aplica headers de segurança em TODA resposta SSR do Worker (não só /api/*).
 * Headers reais cobrem o que meta tags não conseguem (X-Frame-Options, CSP, HSTS).
 *
 * Notas:
 * - CSP é deliberadamente permissivo com 'unsafe-inline' e 'unsafe-eval' porque o
 *   bundle Vite + TanStack injeta scripts inline de hidratação. Endurecer com
 *   nonce exige integração com `ssr: { nonce }` no router (ver docs).
 * - frame-ancestors 'none' substitui X-Frame-Options no nível de CSP, mas mantemos
 *   ambos por compat com browsers antigos.
 * - Permitimos conexão a Supabase (REST + Realtime WebSocket) e Google Fonts.
 */
export const securityHeadersMiddleware = createMiddleware({ type: "request" }).server(
  async ({ next }) => {
    const SUPABASE = "https://bccvpirrqwhqsinlmpth.supabase.co";
    const SUPABASE_WS = "wss://bccvpirrqwhqsinlmpth.supabase.co";

    const csp = [
      "default-src 'self'",
      // Vite injeta scripts inline durante hidratação; em produção mantemos 'unsafe-inline'
      // até migrarmos para nonce-based CSP.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      `connect-src 'self' ${SUPABASE} ${SUPABASE_WS} https://fonts.googleapis.com https://fonts.gstatic.com`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    setResponseHeader("Content-Security-Policy", csp);
    setResponseHeader("X-Frame-Options", "DENY");
    setResponseHeader("X-Content-Type-Options", "nosniff");
    setResponseHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    setResponseHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
    );
    setResponseHeader("X-DNS-Prefetch-Control", "on");
    // HSTS: só faz sentido em produção (HTTPS). Cloudflare já envia, mas reforçamos.
    setResponseHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );

    return next();
  },
);
