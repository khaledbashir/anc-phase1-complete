import { ReactNode } from "react";

// Next.js
import Image from "next/image";

// Types
import { ProposalType } from "@/types";

type ProposalLayoutProps = {
    data: ProposalType;
    children: ReactNode;
};

export default function ProposalLayout({ data, children }: ProposalLayoutProps) {
    const { sender, receiver, details } = data;

    // Instead of fetching all signature fonts, get the specific one user selected.
    const fontHref = details.signature?.fontFamily
        ? `https://fonts.googleapis.com/css2?family=${details?.signature?.fontFamily}&display=swap`
        : "";

    const head = (
        <>
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
                rel="preconnect"
                href="https://fonts.gstatic.com"
                crossOrigin="anonymous"
            />
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link
                href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600;700&family=Montserrat:wght@400;600;700&family=Open+Sans:wght@400;600&display=swap"
                rel="stylesheet"
            ></link>
            {details.signature?.fontFamily && (
                <>
                    {/* eslint-disable-next-line @next/next/no-page-custom-font */}
                    <link href={fontHref} rel="stylesheet" />
                </>
            )}
        </>
    );

    return (
        <>
            {head}
            <section style={{ fontFamily: "'Work Sans', 'Helvetica Condensed', sans-serif", position: 'relative' }}>
                <div className="block p-4 sm:p-10 bg-white rounded-xl shadow-2xl min-h-[1056px] text-[#1a1a1a] relative overflow-hidden border border-white/50">
                    {/* Draft Watermark Safeguard */}
                    {details.status === 'DRAFT' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-45deg] z-0">
                            <span className="text-[120px] font-bold whitespace-nowrap border-[20px] border-zinc-900 px-10 rounded-3xl">
                                DRAFT - INTERNAL VALIDATION ONLY
                            </span>
                        </div>
                    )}
                    <div className="relative z-10 mb-16">
                        {children}
                    </div>

                    {/* FIXED FOOTER - ANC Enterprise Style */}
                    <div className="absolute bottom-8 right-10 flex items-center gap-4 opacity-80">
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-[#0A52EF] tracking-wide">www.anc.com/contact</p>
                            <p className="text-[7px] text-zinc-400 tracking-wider">NY 914.696.2100 TX 940.464.2320</p>
                        </div>
                        <Image src="/ANC_Logo_2023_blue.png" alt="ANC" width={48} height={24} className="w-12 h-6 object-contain" />
                    </div>
                </div>
            </section>
        </>
    );
}
