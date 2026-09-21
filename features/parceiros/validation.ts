import { CATEGORIAS_PARCEIRO } from "@/lib/constants/parceiros";
import { ESTADOS_BRASILEIROS } from "@/lib/constants/estados";
import { safeHttpUrl, whatsappDigits } from "@/lib/partners";
import { optionalStr, str } from "@/lib/validation";

/** Campos comuns ao cadastro ("Quero ser parceiro") e à edição da loja. */
export function parseStoreFields(formData: FormData) {
  const legalName = str(formData, "legal_name");
  const tradeName = str(formData, "trade_name");
  const responsible = str(formData, "responsible");
  const cnpj = str(formData, "cnpj").replace(/\D/g, "");
  const phone = str(formData, "phone").replace(/\D/g, "");
  const whatsapp = whatsappDigits(str(formData, "whatsapp"));
  const instagram = str(formData, "instagram").replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, "");
  const websiteRaw = str(formData, "website");
  const city = str(formData, "city");
  const state = str(formData, "state").toUpperCase();
  const description = optionalStr(formData, "description");
  const category = str(formData, "category");

  if (legalName.length < 2 || legalName.length > 120) return { error: "Informe a razão social ou nome da empresa." };
  if (tradeName.length < 2 || tradeName.length > 80) return { error: "Informe o nome fantasia." };
  if (responsible.length < 2 || responsible.length > 80) return { error: "Informe o nome do responsável." };
  if (cnpj && cnpj.length !== 14) return { error: "CNPJ inválido (são 14 números). Ele é opcional." };
  if (!/^\d{10,11}$/.test(phone) && !/^\d{12,13}$/.test(phone)) return { error: "Informe um telefone com DDD." };
  if (whatsapp && !/^\d{12,13}$/.test(whatsapp)) return { error: "WhatsApp inválido. Use DDD + número." };
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) return { error: "Instagram inválido. Use apenas o @usuário." };
  const website = websiteRaw ? safeHttpUrl(websiteRaw) : null;
  if (websiteRaw && (!website || website.length > 300)) return { error: "Site inválido. Use um endereço http(s)." };
  if (city.length < 2 || city.length > 80) return { error: "Informe a cidade." };
  if (!ESTADOS_BRASILEIROS.some((e) => e.uf === state)) return { error: "Escolha o estado." };
  if (description && description.length > 1000) return { error: "A descrição pode ter até 1000 caracteres." };
  if (!CATEGORIAS_PARCEIRO.some((c) => c.value === category)) return { error: "Escolha a categoria." };

  return {
    values: {
      legal_name: legalName,
      trade_name: tradeName,
      cnpj: cnpj || null,
      responsible,
      phone,
      whatsapp: whatsapp || null,
      instagram: instagram || null,
      website,
      city,
      state,
      description,
      category,
    },
  };
}
