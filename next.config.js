const withNextIntl = require("next-intl/plugin")("./i18n/request.ts");
const path = require("path");
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
    outputFileTracingRoot: path.join(__dirname),
    serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    experimental: {
        serverActions: {
            bodySizeLimit: "2000mb",
        },
    },
    transpilePackages: [
        "react-markdown",
        "remark-gfm",
        "micromark-extension-gfm",
        "micromark-extension-gfm-autolink-literal",
        "micromark-extension-gfm-footnote",
        "micromark-extension-gfm-strikethrough",
        "micromark-extension-gfm-table",
        "micromark-extension-gfm-tagfilter",
        "micromark-extension-gfm-task-list-item",
        "ccount",
        "devlop",
        "mdast-util-find-and-replace",
        "mdast-util-gfm",
        "mdast-util-gfm-autolink-literal",
        "mdast-util-gfm-footnote",
        "mdast-util-gfm-strikethrough",
        "mdast-util-gfm-table",
        "mdast-util-gfm-task-list-item",
        "mdast-util-to-markdown",
        "mdast-util-phrasing",
        "escape-string-regexp",
    ],
    generateBuildId: async () => {
        return `build-${Date.now()}`;
    },
    async headers() {
        return [
            {
                source: "/((?!_next/static|_next/image|favicon.ico).*)",
                headers: [
                    { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
                    { key: "Pragma", value: "no-cache" },
                ],
            },
        ];
    },
    webpack: (config, { isServer }) => {
        config.module.rules.push({
            test: /\.map$/,
            use: "ignore-loader",
        });

        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
            };

        }
        return config;
    },
};

// Bundle analyzer
const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
});

const wrapped = withBundleAnalyzer(withNextIntl(nextConfig));

const sentryOptions = {
    org: process.env.SENTRY_ORG || "",
    project: process.env.SENTRY_PROJECT || "",
    silent: !process.env.CI,
};

module.exports = withSentryConfig(wrapped, sentryOptions);
