import { NextRequest, NextResponse } from "next/server";
import http from "http";
import { Readable } from "stream";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max
export const dynamic = "force-dynamic";

const TRIAGE_INTERNAL_URL = "http://127.0.0.1:8000";

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const targetPath = "/" + path.join("/");
    const targetUrl = new URL(targetPath, TRIAGE_INTERNAL_URL);

    // Forward query params
    req.nextUrl.searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
    });

    // Safelist headers to avoid 431 error
    const headers: Record<string, string> = {};
    if (req.headers.has("content-type")) {
        headers["content-type"] = req.headers.get("content-type")!;
    }
    if (req.headers.has("content-length")) {
        headers["content-length"] = req.headers.get("content-length")!;
    }

    return new Promise((resolve) => {
        const proxyReq = http.request(
            targetUrl.toString(),
            {
                method: req.method,
                headers,
                // Increase timeout for the internal request to 10 mins
                timeout: 600000,
            },
            (proxyRes) => {
                // Transfer headers from proxy response
                const resHeaders = new Headers();
                if (proxyRes.headers["content-type"]) {
                    resHeaders.set("content-type", proxyRes.headers["content-type"] as string);
                }
                if (proxyRes.headers["content-disposition"]) {
                    resHeaders.set("content-disposition", proxyRes.headers["content-disposition"] as string);
                }

                // Convert Node.js IncomingMessage to Web ReadableStream for Next.js
                // This ensures full streaming transparency from Python -> Browser
                const responseStream = new ReadableStream({
                    start(controller) {
                        proxyRes.on("data", (chunk) => controller.enqueue(chunk));
                        proxyRes.on("end", () => controller.close());
                        proxyRes.on("error", (err) => controller.error(err));
                    }
                });

                resolve(new NextResponse(responseStream, {
                    status: proxyRes.statusCode || 200,
                    headers: resHeaders,
                }));
            }
        );

        proxyReq.on("error", (err) => {
            console.error("[pdf-triage proxy] Request error:", err.message);
            resolve(NextResponse.json(
                { detail: `Internal proxy error: ${err.message}` },
                { status: 502 }
            ));
        });

        proxyReq.on("timeout", () => {
            console.error("[pdf-triage proxy] Request timeout");
            proxyReq.destroy();
            resolve(NextResponse.json(
                { detail: "Triage service request timed out" },
                { status: 504 }
            ));
        });

        // Pipe the NextRequest body stream into the Node.js http.request
        if (req.body) {
            // Native ReadableStream to Node.js Readable helper
            Readable.fromWeb(req.body as any).pipe(proxyReq);
        } else {
            proxyReq.end();
        }
    });
}

export const POST = proxyRequest;
export const GET = proxyRequest;
