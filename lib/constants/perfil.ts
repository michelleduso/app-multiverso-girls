export const ESTILOS_DE_ROLE = [
  { value: "passeio_tranquilo", label: "Passeio tranquilo" },
  { value: "bate_volta", label: "Bate-volta" },
  { value: "estrada", label: "Estrada" },
  { value: "viagem", label: "Viagem" },
  { value: "urbano", label: "Urbano" },
  { value: "aventura", label: "Aventura" },
  { value: "iniciante", label: "Iniciante" },
  { value: "outros", label: "Outros" },
] as const;

export type EstiloDeRole = (typeof ESTILOS_DE_ROLE)[number]["value"];

/** Somente perfis "approved" acessam a comunidade. */
export const STATUS_PERFIL = ["pending", "approved", "rejected", "suspended"] as const;

export type StatusPerfil = (typeof STATUS_PERFIL)[number];
