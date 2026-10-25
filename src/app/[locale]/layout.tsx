import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Anton, Noto_Sans, Noto_Sans_Telugu, Noto_Serif_Telugu, Petrona } from "next/font/google";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
import "../globals.css";
import "../ledger.css";
import "../site.css";

const poster = Anton({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-poster",
});

const sans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-noto",
});

const sansTelugu = Noto_Sans_Telugu({
  subsets: ["telugu"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-telugu-ui",
});

const petrona = Petrona({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-petrona",
});

const telugu = Noto_Serif_Telugu({
  subsets: ["telugu", "latin"],
  weight: "600",
  display: "swap",
  variable: "--font-telugu",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: {
    default: "Praja Ledger",
    template: "%s · Praja Ledger",
  },
  description:
    "A public register of Telangana leaders. Offices, elections, promises, finances, and court proceedings, each line tied to a document.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${poster.variable} ${sans.variable} ${sansTelugu.variable} ${petrona.variable} ${telugu.variable}`}
    >
      <body>
        <NextIntlClientProvider>
          <div className="site">
            <SiteHeader locale={locale} />
            <main className="site-main">{children}</main>
            <SiteFooter />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
