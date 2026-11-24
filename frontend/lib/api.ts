/** Django API bilan ishlash. Serverda API_URL (ichki tarmoq), brauzerda NEXT_PUBLIC_API_URL. */

export const PUBLIC_API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
const SERVER_API = (process.env.API_URL || PUBLIC_API).replace(/\/$/, "");

export type Region = { id: number; slug: string; name_uz: string; name_ru: string; name_en: string; monuments_count?: number };

export type MonumentBrief = {
  id: number; slug: string; name_uz: string; name_ru: string; name_en: string;
  kind: string; city: string; region: Region; latitude: string; longitude: string;
};
export type Monument = MonumentBrief & {
  period: string; century: number | null; cover_url: string | null; inscriptions_count: number;
  address?: string; description_uz?: string; description_ru?: string; description_en?: string;
  inscriptions?: InscriptionListItem[];
};

export type InscriptionListItem = {
  id: number; slug: string; title_uz: string; title_ru: string; title_en: string;
  language: string; script: string; technique: string; period_text: string;
  year_from: number | null; year_to: number | null; monument: MonumentBrief;
  image_url: string | null; lat: string; lng: string; original_text: string; status: string;
};

export type Inscription = Omit<InscriptionListItem, "monument" | "image_url"> & {
  monument: Monument;
  images: { id: number; url: string; caption: string; credit: string; is_primary: boolean }[];
  sources: { id: number; kind: string; citation: string; url: string; pages: string }[];
  placement_uz: string; placement_ru: string; placement_en: string;
  transliteration: string;
  translation_uz: string; translation_ru: string; translation_en: string;
  commentary_uz: string; commentary_ru: string; commentary_en: string;
  hijri_date: string; calligrapher: string; views_count: number; published_at: string | null;
  submitted_by_name: string | null;
  related: { slug: string; title_uz: string; title_ru: string; title_en: string; language: string }[];
};

export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export type Stats = { inscriptions: number; monuments: number; regions: number; by_language: Record<string, number> };

export async function apiGet<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_API}/api${path}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // API ishlamasa sahifa bo'sh holatda ochiladi
  }
}

export function qs(params: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
