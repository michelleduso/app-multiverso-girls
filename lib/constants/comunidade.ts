/** Tipos de rolê (`rides.ride_type`). */
export const TIPOS_DE_ROLE = [
  { value: "hoje", label: "Hoje", emoji: "⚡" },
  { value: "bate_volta", label: "Bate-volta", emoji: "🔁" },
  { value: "passeio", label: "Passeio", emoji: "🏍️" },
  { value: "viagem", label: "Viagem", emoji: "🧳" },
  { value: "cafe_encontro", label: "Café/encontro", emoji: "☕" },
  { value: "evento", label: "Evento", emoji: "🎉" },
  { value: "outro", label: "Outro", emoji: "📍" },
] as const;

export type TipoDeRole = (typeof TIPOS_DE_ROLE)[number]["value"];

export function tipoDeRole(value: string) {
  return TIPOS_DE_ROLE.find((t) => t.value === value) ?? TIPOS_DE_ROLE[TIPOS_DE_ROLE.length - 1];
}

/** Categorias de grupo (`groups.category`). */
export const CATEGORIAS_DE_GRUPO = [
  { value: "cidade_regiao", label: "Cidade/região" },
  { value: "modelo_moto", label: "Modelo de moto" },
  { value: "iniciantes", label: "Iniciantes" },
  { value: "viagens", label: "Viagens" },
  { value: "encontros", label: "Encontros" },
  { value: "estilo_pilotagem", label: "Estilo de pilotagem" },
  { value: "outros", label: "Outros" },
] as const;

export function categoriaDeGrupo(value: string) {
  return CATEGORIAS_DE_GRUPO.find((c) => c.value === value)?.label ?? "Outros";
}

/** Motivos de denúncia (`reports.reason`). */
export const MOTIVOS_DE_DENUNCIA = [
  { value: "perfil_falso", label: "Perfil falso" },
  { value: "assedio", label: "Assédio" },
  { value: "conteudo_ofensivo", label: "Conteúdo ofensivo" },
  { value: "spam", label: "Spam" },
  { value: "comportamento_perigoso", label: "Comportamento perigoso" },
  { value: "discriminacao", label: "Discriminação" },
  { value: "golpe", label: "Tentativa de golpe" },
  { value: "outro", label: "Outro" },
] as const;

export function motivoDeDenuncia(value: string) {
  return MOTIVOS_DE_DENUNCIA.find((m) => m.value === value)?.label ?? value;
}

export const TIPOS_DE_DENUNCIA = {
  profile: "Perfil",
  message: "Mensagem",
  group: "Grupo",
  ride: "Rolê",
  behavior: "Comportamento",
} as const;

export const ACOES_DE_MODERACAO = {
  ignore: "Denúncia ignorada",
  warn: "Advertência",
  remove_content: "Conteúdo removido",
  suspend_user: "Suspensão temporária",
  ban_user: "Banimento permanente",
  suspend_group: "Grupo suspenso",
  delete_group: "Grupo excluído",
} as const;
