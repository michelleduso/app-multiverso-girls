export function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function optionalStr(formData: FormData, key: string) {
  return str(formData, key) || null;
}

/** Só aceita URLs do nosso próprio Storage público (evita imagem externa/rastreador). */
export function safeStorageUrl(url: string | null, bucket: string) {
  if (!url) return null;
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
  return url.startsWith(base) ? url : null;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
