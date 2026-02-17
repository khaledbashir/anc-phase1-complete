const withNextIntl = require("next-intl/plugin")("./i18n/request.ts");
const path = require("path");
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
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
            // Force a single React copy for @react-three/* and all other deps
            config.resolve.alias = {
                ...config.resolve.alias,
                react: path.resolve(__dirname, "node_modules/react"),
                "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
                "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime"),
                "react/jsx-dev-runtime": path.resolve(__dirname, "node_modules/react/jsx-dev-runtime"),
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
