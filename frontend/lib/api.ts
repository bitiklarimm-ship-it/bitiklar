/** Django API bilan ishlash.
 *
 * Bitta serverli rejim: brauzer API'ga shu domenning o'zidan (nisbiy "/api/...") murojaat qiladi,
 * Nginx uni Django'ga uzatadi. Next.js serverining o'zi esa Django'ga ichkaridan (API_URL) boradi.
 * NEXT_PUBLIC_API_URL faqat API alohida domenda bo'lsa kerak (masalan, ishlab chiqishda http://localhost:8000).
 */

export const PUBLIC_API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const SERVER_API = (process.env.API_URL || PUBLIC_API || "http://127.0.0.1:8000").replace(/\/$/, "");

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
  images: InscriptionImage[];
  sources: { id: number; kind: string; citation: string; url: string; pages: string }[];
  placement_uz: string; placement_ru: string; placement_en: string;
  transliteration: string;
  translation_uz: string; translation_ru: string; translation_en: string;
  commentary_uz: string; commentary_ru: string; commentary_en: string;
  hijri_date: string; calligrapher: string; views_count: number; published_at: string | null;
  submitted_by_name: string | null;
  audio_url: string | null; audio_caption: string;
  updated_at: string; created_at: string;
  latitude: string | null; longitude: string | null;
  related: { slug: string; title_uz: string; title_ru: string; title_en: string; language: string }[];
};

export type Annotation = { x: number; y: number; w: number; h: number; label: string };
export type InscriptionImage = {
  id: number; url: string; caption: string; credit: string; is_primary: boolean; annotations?: Annotation[];
};

/** /api/inscriptions/geojson/ — jonli xarita uchun */
export type InscriptionFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    slug: string; language: string; script: string; period_text: string;
    title_uz: string; title_ru: string; title_en: string;
    monument_slug: string; monument_uz: string; monument_ru: string; monument_en: string;
    city: string; precise: boolean; image_url: string | null; original_text: string;
  };
};
export type MonumentFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: number; slug: string; kind: string; city: string;
    name_uz: string; name_ru: string; name_en: string; inscriptions_count: number;
  };
};
export type FeatureCollection<F> = { type: "FeatureCollection"; features: F[] };

export type RouteStop = { id: number; order: number; note_uz: string; note_ru: string; note_en: string; monument: Monument };
export type Route = {
  id: number; slug: string; title_uz: string; title_ru: string; title_en: string;
  description_uz: string; description_ru: string; description_en: string;
  region: Region | null; duration: string; cover_url: string | null; stops_count: number;
  stops?: RouteStop[];
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
