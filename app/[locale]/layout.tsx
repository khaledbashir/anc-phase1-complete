// Components
import { BaseFooter, BaseNavbar } from "@/app/components";
// ShadCn
import { Toaster } from "@/components/ui/toaster";
// Contexts
import Providers from "@/contexts/Providers";
// Fonts
import {
    alexBrush,
    dancingScript,
    greatVibes,
    outfit,
    parisienne,
} from "@/lib/fonts";
// SEO
import { JSONLD, ROOTKEYWORDS } from "@/lib/seo";
// Variables
import { BASE_URL, GOOGLE_SC_VERIFICATION, LOCALES } from "@/lib/variables";
// Favicon
import Favicon from "@/public/assets/favicon/favicon.ico";
// Vercel Analytics
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
// Next Intl
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
    title: "ANC Proposal Engine | Professional Sports Technology Proposals",
    description:
        "Create professional proposals for LED screens, sports technology, and digital signage projects with ANC Proposal Engine.",
    icons: [{ rel: "icon", url: Favicon.src }],
    keywords: ROOTKEYWORDS,
    robots: {
        index: true,
        follow: true,
    },
    alternates: {
        canonical: BASE_URL,
    },
    authors: {
        name: "ANC Sports",
    },
    verification: {
        google: GOOGLE_SC_VERIFICATION,
    },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
};

export function generateStaticParams() {
    // Next.js expects an array of objects: [{ locale: 'en' },
    // ...]
    const locales = LOCALES.map((locale) => ({ locale: locale.code }));
    return locales;
}

export default async function LocaleLayout(props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const params = await props.params;

    const { locale } = params;

    const { children } = props;

    let messages;
    try {
        messages = (await import(`@/i18n/locales/${locale}.json`)).default;
    } catch (error) {
        notFound();
    }

    return (
        <html lang={locale} suppressHydrationWarning>
            <head suppressHydrationWarning>
                <script
                    type="application/ld+json"
                    id="json-ld"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
                />
            </head>
            <body
                className={`${outfit.className} antialiased bg-zinc-50 dark:bg-zinc-950`}
                suppressHydrationWarning
            >
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Providers>
                        <BaseNavbar />

                        <div className="flex flex-col">{children}</div>

                        <BaseFooter />

                        {/* Toast component */}
                        <Toaster />

                        {/* Vercel analytics */}
                        <Analytics />
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
