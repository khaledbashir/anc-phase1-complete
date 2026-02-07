const withNextIntl = require("next-intl/plugin")("./i18n/request.ts");
const path = require("path");
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingRoot: path.join(__dirname),
    serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
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
