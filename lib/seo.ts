import { BASE_URL } from "@/lib/variables";

export const ROOTKEYWORDS = [
    "proposal",
    "proposal generator",
    "LED screen proposal",
    "digital signage proposal",
    "ANC Sports",
    "sports technology proposals",
    "proposal app",
];

export const JSONLD = {
    "@context": "https://schema.org",
    "@type": "Website",
    name: "ANC Proposal Engine",
    description: "Professional proposal generator for sports technology and LED screen projects",
    keywords: ROOTKEYWORDS,
    url: BASE_URL,
    mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${BASE_URL}/#website`,
    },
    author: {
        "@type": "Organization",
        name: "ANC Sports",
    },
    "@graph": [
        {
            "@type": "WebSite",
            "@id": `${BASE_URL}/#website`,
            url: `${BASE_URL}`,
        },
    ],
};
