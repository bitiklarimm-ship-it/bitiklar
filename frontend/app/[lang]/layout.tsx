import type { Metadata, Viewport } from "next";
import { Amiri, Cormorant_Garamond, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import BackToTop from "@/components/BackToTop";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MobileTabBar from "@/components/MobileTabBar";
import SWRegister from "@/components/SWRegister";
import { getDict, isLocale, LOCALES } from "@/lib/i18n";
import "../globals.css";

const sans = Inter({ subsets: ["latin", "cyrillic"], variable: "--f-sans", display: "swap" });
const serif = Cormorant_Garamond({ subsets: ["latin", "cyrillic"], weight: ["500", "600", "700"], style: ["normal", "italic"], variable: "--f-serif", display: "swap" });
const arabic = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--f-arabic", display: "swap" });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1424" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Sahifa chizilishidan oldin saqlangan mavzuni qo'llaydi (oq "miltillash" bo'lmasligi uchun)
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const d = getDict(lang);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://bitiklar.uz";
  return {
    metadataBase: new URL(site),
    title: { default: d.meta.title, template: `%s — BITIKLAR` },
    description: d.meta.description,
    icons: { icon: "/favicon.svg" },
    alternates: { languages: { uz: "/uz", ru: "/ru", en: "/en" } },
    openGraph: { siteName: "BITIKLAR", title: d.meta.title, description: d.meta.description, locale: lang },
  };
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const d = getDict(lang);
  return (
    <html lang={lang} className={`${sans.variable} ${serif.variable} ${arabic.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">↓</a>
        <Header lang={lang} d={d} />
        <main id="main">{children}</main>
        <Footer lang={lang} d={d} />
        <MobileTabBar lang={lang} d={d} />
        <BackToTop label={d.ui.top} />
        <SWRegister />
      </body>
    </html>
  );
}
