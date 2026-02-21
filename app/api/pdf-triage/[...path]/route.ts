import { NextRequest, NextResponse } from "next/server";

/**
 * Catch-all proxy for the Python PDF triage service.
 * The Python service runs on localhost:8000 inside the same Docker container.
 * The browser can't reach it directly, so Next.js proxies the requests.
 */
const TRIAGE_INTERNAL_URL = "http://127.0.0.1:8000";

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const targetPath = "/api/" + path.join("/");
    const targetUrl = new URL(targetPath, TRIAGE_INTERNAL_URL);

    // Forward query params
    req.nextUrl.searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
    });

    const contentType = req.headers.get("content-type") || "";

    let body: any;
    let headers: Record<string, string> = {};

    if (contentType.includes("multipart/form-data")) {
        // For multipart (file uploads), pass the raw body through
        body = await req.arrayBuffer();
        headers["content-type"] = contentType;
    } else if (contentType.includes("application/json")) {
        body = await req.text();
        headers["content-type"] = "application/json";
    } else {
        // Fallback: try to read as text
        try {
            body = await req.text();
            if (body) headers["content-type"] = contentType || "text/plain";
        } catch {
            body = undefined;
        }
    }

    try {
        const upstream = await fetch(targetUrl.toString(), {
            method: req.method,
            headers,
            body: req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
        });

        const respContentType = upstream.headers.get("content-type") || "";

        if (respContentType.includes("application/json")) {
            const json = await upstream.json();
            return NextResponse.json(json, { status: upstream.status });
        }

        // For binary responses (PDF downloads, etc.)
        const blob = await upstream.arrayBuffer();
        return new NextResponse(blob, {
            status: upstream.status,
            headers: {
                "content-type": respContentType,
                ...(upstream.headers.get("content-disposition")
                    ? { "content-disposition": upstream.headers.get("content-disposition")! }
                    : {}),
            },
        });
    } catch (err: any) {
        console.error("[pdf-triage proxy] Error:", err.message);
        return NextResponse.json(
            { detail: `Triage service unavailable: ${err.message}` },
            { status: 502 }
        );
    }
}

export const POST = proxyRequest;
export const GET = proxyRequest;

export const runtime = "nodejs";
// Allow large file uploads (2GB) and long processing times
export const maxDuration = 300;
export const fetchCache = "force-no-store";

// Next.js 15 route segment config – allow up to 2GB request bodies
export const config = {
    api: {
        bodyParser: false,
        responseLimit: false,
    },
};
