import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "./lib/i18n";

function preferred(req: NextRequest): string {
  const saved = req.cookies.get("lang")?.value;
  if (saved && (LOCALES as readonly string[]).includes(saved)) return saved;
  const header = req.headers.get("accept-language") || "";
  for (const part of header.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if ((LOCALES as readonly string[]).includes(code)) return code;
  }
  return DEFAULT_LOCALE;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const has = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (has) return NextResponse.next();
  // Nginx orqasida ishlaganda req.nextUrl ichki manzilni (localhost:3000) ko'rsatadi.
  // Shuning uchun yo'naltirish manzilini brauzer yuborgan Host sarlavhasidan quramiz.
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const proto = (req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "")).split(",")[0].trim();
  const target = `/${preferred(req)}${pathname === "/" ? "" : pathname}${req.nextUrl.search}`;
  return NextResponse.redirect(new URL(target, `${proto}://${host}`));
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
