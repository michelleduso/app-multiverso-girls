import path from "node:path";
import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança para todas as rotas.
 * TODO (antes do lançamento): adicionar Content-Security-Policy — exige liberar o host do
 * Supabase (API, Realtime/WebSocket e Storage) e nonces do Next; ver docs/AUDITORIA-MVP.md.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // sem mapa/localização exata no produto: bloqueia geolocalização; câmera/microfone não são usados
  { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // o service worker precisa ser sempre revalidado para receber correções de segurança
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
