/**
 * Formatação de datas no fuso de Brasília. O Brasil não tem horário de verão
 * desde 2019, então o offset fixo -03:00 é seguro para montar/ler `starts_at`.
 */
const TZ = "America/Sao_Paulo";

export function toStartsAt(date: string, time: string) {
  return new Date(`${date}T${time}:00-03:00`);
}

/** "2026-09-20" no fuso de Brasília. */
export function dateKey(d: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d));
}

/** Data e hora locais para preencher os inputs `date`/`time`. */
export function splitStartsAt(iso: string) {
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date: dateKey(d), time };
}

/** "08h" ou "08h30". */
export function formatHour(iso: string) {
  const [h, m] = splitStartsAt(iso).time.split(":");
  return m === "00" ? `${h}h` : `${h}h${m}`;
}

/** "dom., 20/09". */
export function formatDay(iso: string) {
  const d = new Date(iso);
  const weekday = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "short" }).format(d);
  const day = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(d);
  const today = dateKey(new Date());
  const tomorrow = dateKey(new Date(Date.now() + 86_400_000));
  if (dateKey(d) === today) return "Hoje";
  if (dateKey(d) === tomorrow) return "Amanhã";
  return `${weekday} ${day}`;
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Hora da mensagem: hoje → "14:32"; antes → "20/09 14:32". */
export function formatMessageTime(iso: string) {
  const d = new Date(iso);
  const hm = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  if (dateKey(d) === dateKey(new Date())) return hm;
  const dm = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(d);
  return `${dm} ${hm}`;
}

/** Início e fim do dia de hoje (Brasília) como ISO, para filtrar "Pra hoje". */
export function todayRange() {
  const key = dateKey(new Date());
  return {
    start: new Date(`${key}T00:00:00-03:00`).toISOString(),
    end: new Date(`${key}T23:59:59.999-03:00`).toISOString(),
  };
}

/** Comparação de cidades sem acento/caixa: "Sao Paulo" == "são paulo". */
export function cityKey(city: string | null | undefined) {
  return (city ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/** ISO de "agora + n dias" (n negativo = passado). Fica fora dos componentes por causa da regra de pureza do React. */
export function daysFromNow(n: number) {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}
