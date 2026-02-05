// Components
import { BaseFooter, BaseNavbar } from "@/app/components";
// ShadCn
import { Toaster } from "@/components/ui/toaster";
// Contexts
import Providers from "@/contexts/Providers";
// Fonts
import {
    workSans,
    playfairDisplay,
} from "@/lib/fonts";
// SEO
import { JSONLD, ROOTKEYWORDS } from "@/lib/seo";
// Variables
import { BASE_URL, GOOGLE_SC_VERIFICATION } from "@/lib/variables";
import type { Metadata } from "next";
// Next Intl
import { NextIntlClientProvider } from "next-intl";

// Styles
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "./globals.css";

// Import English messages directly
import enMessages from "@/i18n/locales/en.json";

export const metadata: Metadata = {
    title: "ANC Proposal Engine | Professional Sports Technology Proposals",
    description:
        "Create professional proposals for LED screens, sports technology, and digital signage projects with ANC Proposal Engine.",
    icons: [{ rel: "icon", url: "/anc-logo-blue.png" }],
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

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const locale = "en";
    const messages = enMessages;

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
                className={`${workSans.className} ${playfairDisplay.variable} antialiased bg-background text-foreground`}
                suppressHydrationWarning
            >
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Providers>
                        <BaseNavbar />

                        <div className="flex flex-col">{children}</div>

                        <BaseFooter />

                        {/* Toast component */}
                        <Toaster />

                        {/* Umami Analytics */}
                        <script
                            defer
                            src="https://basheer-umami.prd42b.easypanel.host/script.js"
                            data-website-id="d981769e-1a25-49dd-9e09-0533ee7ce145"
                        ></script>
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
