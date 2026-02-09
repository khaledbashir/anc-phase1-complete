// Next Google Fonts
import {
    Dancing_Script,
    Great_Vibes,
    Work_Sans,
    Parisienne,
    Playfair_Display,
} from "next/font/google";

// Primary Brand Font
export const workSans = Work_Sans({
    subsets: ["latin"],
    display: "swap",
    adjustFontFallback: false,
    variable: "--font-work-sans",
});

// Boutique Headline Font
export const playfairDisplay = Playfair_Display({
    subsets: ["latin"],
    display: "swap",
    weight: ["700", "900"],
    variable: "--font-playfair",
});

// Signature fonts
export const dancingScript = Dancing_Script({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-dancing-script",
    preload: true,
    display: "swap",
});

export const parisienne = Parisienne({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-parisienne",
    preload: true,
    display: "swap",
});

export const greatVibes = Great_Vibes({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-great-vibes",
    preload: true,
    display: "swap",
});

