export const CATEGORIAS_PARCEIRO = [
  { value: "acessorios", label: "Acessórios" },
  { value: "roupas", label: "Roupas" },
  { value: "capacetes", label: "Capacetes" },
  { value: "oficina", label: "Oficina" },
  { value: "pecas", label: "Peças" },
  { value: "concessionaria", label: "Concessionária" },
  { value: "turismo", label: "Turismo" },
  { value: "seguro", label: "Seguro" },
  { value: "estetica_personalizacao", label: "Estética/personalização" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "outros", label: "Outros" },
] as const;

export function categoriaParceiro(value: string) {
  return CATEGORIAS_PARCEIRO.find((c) => c.value === value)?.label ?? "Outros";
}

export const STATUS_PARCEIRO = {
  pending: "Em análise",
  approved: "Aprovado",
  rejected: "Recusado",
  suspended: "Suspenso",
} as const;

export const STATUS_PRODUTO = {
  draft: "Rascunho",
  active: "Ativo",
  paused: "Pausado",
  blocked: "Bloqueado",
} as const;

export const STATUS_ASSINATURA = {
  none: "Sem plano",
  scheduled: "Agendado",
  trial: "Teste",
  active: "Ativo",
  expired: "Vencido",
  suspended: "Suspenso",
} as const;
