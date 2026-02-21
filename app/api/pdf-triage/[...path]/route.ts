import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// Allow Next.js 15 to take up to 300 seconds processing the request
export const maxDuration = 300;
export const fetchCache = "force-no-store";

// Next.js 15 config to disable body parsing for massive 2GB files
export const config = {
    api: {
        bodyParser: false,
        responseLimit: false,
    },
};

const TRIAGE_INTERNAL_URL = "http://127.0.0.1:8000";

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const targetPath = "/api/" + path.join("/");
    const targetUrl = new URL(targetPath, TRIAGE_INTERNAL_URL);

    // Forward query params
    req.nextUrl.searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
    });

    // Safelist headers: ONLY forward safe headers, explicitly ignoring NextAuth cookies
    // which cause FastAPI to throw a 431 Request Header Fields Too Large.
    const headers = new Headers();
    if (req.headers.has("content-type")) {
        headers.set("content-type", req.headers.get("content-type")!);
    }
    if (req.headers.has("content-length")) {
        headers.set("content-length", req.headers.get("content-length")!);
    }

    try {
        // We pass the raw readable stream DIRECTLY to fetch, rather than doing req.arrayBuffer(),
        // so it never loads the 2GB file into memory, bypassing the 10MB boundary limitations.
        const upstream = await fetch(targetUrl.toString(), {
            method: req.method,
            headers,
            body: (req.method !== "GET" && req.method !== "HEAD") ? req.body as any : undefined,
            // @ts-ignore Node.js specific fetch extension required when streaming request bodies
            duplex: "half",
        });

        const respHeaders = new Headers();
        if (upstream.headers.has("content-type")) {
            respHeaders.set("content-type", upstream.headers.get("content-type")!);
        }
        if (upstream.headers.has("content-disposition")) {
            respHeaders.set("content-disposition", upstream.headers.get("content-disposition")!);
        }

        return new NextResponse(upstream.body, {
            status: upstream.status,
            headers: respHeaders,
        });

    } catch (err: any) {
        console.error("[pdf-triage streaming proxy] Error:", err.message);
        return NextResponse.json(
            { detail: `Triage service unavailable: ${err.message}` },
            { status: 502 }
        );
    }
}

export const POST = proxyRequest;
export const GET = proxyRequest;
