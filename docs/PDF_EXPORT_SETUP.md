# PDF Export Setup Guide

This document provides all the endpoints, configuration, and code patterns needed to set up PDF export in another project using jsreport and Puppeteer.

---

## 1. Environment Variables

### jsreport Configuration
```env
# jsreport Server
JSREPORT_URL=https://your-jsserver.example.com
JSREPORT_USER=admin
JSREPORT_PASSWORD=admin
```

### Puppeteer/Browserless Configuration
```env
# Browserless (remote Chrome instance)
BROWSERLESS_INTERNAL_URL=ws://browserless:3000  # Docker internal network
BROWSERLESS_URL=wss://your-browserless.example.com  # External URL

# Local Chromium (fallback for serverless)
PUPPETEER_EXECUTABLE_PATH=/path/to/chromium
```

---

## 2. API Endpoints

### jsreport Endpoint
- **URL**: `POST ${JSREPORT_URL}/api/report`
- **Auth**: Basic Auth (Base64 encoded `user:password`)
- **Content-Type**: `application/json`

### Internal API Routes (this project)
| Route | Engine | Description |
|-------|--------|-------------|
| `/api/proposals/generate` | Puppeteer | Main PDF generation with Browserless |
| `/api/proposals/generate-jsreport` | jsreport | Alternative using jsreport chrome-pdf |
| `/api/performance/reports/[id]/pdf` | jsreport | Performance reports PDF |

---

## 3. jsreport Payload Structure

```typescript
const jsreportPayload = {
  template: {
    engine: "none",           // "none" for raw HTML, or "handlebars", "ejs", etc.
    recipe: "chrome-pdf",     // PDF output using Chrome
    content: fullHtml,        // Your complete HTML document
    chrome: {
      printBackground: true,
      displayHeaderFooter: true,
      mediaType: "screen",
      waitForNetworkIdle: true,
      waitForJS: false,       // Set true if page signals readiness via JS
      headerTemplate: '<div style="font-size:1px;"></div>',
      footerTemplate: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; 
                    width: 100%; padding: 0 40px; 
                    display: flex; justify-content: space-between; 
                    align-items: center; border-top: 1px solid #e5e7eb; 
                    padding-top: 4px; box-sizing: border-box;">
          <div style="font-size: 7.5px; font-weight: 600; color: #0A52EF;">
            www.anc.com
          </div>
          <div style="font-size: 7px; color: #94a3b8;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        </div>
      `,
      marginTop: "20px",
      marginBottom: "40px",
      marginLeft: "20px",
      marginRight: "20px",
      width: "8.5in",         // Letter size
      height: "11in",
      landscape: false,
    },
  },
};
```

### Page Layout Options
```typescript
const pageLayoutMap: Record<string, { width: string; height: string; landscape: boolean }> = {
  "portrait-letter": { width: "8.5in", height: "11in", landscape: false },
  "portrait-legal": { width: "8.5in", height: "14in", landscape: false },
  "portrait-a4": { width: "8.27in", height: "11.69in", landscape: false },
  "landscape-letter": { width: "11in", height: "8.5in", landscape: true },
  "landscape-legal": { width: "14in", height: "8.5in", landscape: true },
  "landscape-a4": { width: "11.69in", height: "8.27in", landscape: true },
};
```

---

## 4. jsreport API Call Pattern

```typescript
import { JSREPORT_URL, JSREPORT_USER, JSREPORT_PASSWORD } from "@/lib/variables";

async function generatePdfViaJsreport(fullHtml: string): Promise<ArrayBuffer> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add basic auth if credentials are configured
  if (JSREPORT_USER && JSREPORT_PASSWORD) {
    const credentials = Buffer.from(`${JSREPORT_USER}:${JSREPORT_PASSWORD}`).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  }

  const jsreportPayload = {
    template: {
      engine: "none",
      recipe: "chrome-pdf",
      content: fullHtml,
      chrome: {
        printBackground: true,
        displayHeaderFooter: true,
        mediaType: "screen",
        waitForNetworkIdle: true,
        marginTop: "20px",
        marginBottom: "40px",
        marginLeft: "20px",
        marginRight: "20px",
        width: "8.5in",
        height: "11in",
        landscape: false,
      },
    },
  };

  const response = await fetch(`${JSREPORT_URL}/api/report`, {
    method: "POST",
    headers,
    body: JSON.stringify(jsreportPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`jsreport PDF generation failed: ${response.status} ${errorText}`);
  }

  const pdfBuffer = await response.arrayBuffer();
  
  if (pdfBuffer.byteLength === 0) {
    throw new Error("jsreport returned empty PDF");
  }

  return pdfBuffer;
}
```

---

## 5. Puppeteer/Browserless Pattern

```typescript
import chromium from "@sparticuz/chromium";
import { ENV } from "@/lib/variables";

async function getBrowser() {
  const puppeteer = (await import("puppeteer-core")).default;
  const internalUrl = process.env.BROWSERLESS_INTERNAL_URL || "ws://browserless:3000";
  const externalUrl = process.env.BROWSERLESS_URL;
  let browser;

  // 1. Try internal Docker network (fastest)
  try {
    browser = await puppeteer.connect({ browserWSEndpoint: internalUrl });
    console.log("Browserless connected via internal network!");
    return browser;
  } catch (e) {
    console.log(`Internal Browserless unavailable`);
  }

  // 2. Try external Browserless URL
  if (externalUrl) {
    try {
      browser = await puppeteer.connect({ browserWSEndpoint: externalUrl });
      console.log("Browserless connected via external URL!");
      return browser;
    } catch (e) {
      console.error("External Browserless connect failed");
    }
  }

  // 3. Fallback to local Chromium (production/serverless)
  if (ENV === "production") {
    const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath();
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--disable-dev-shm-usage",
        "--ignore-certificate-errors",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
      ],
      executablePath: execPath,
      headless: true,
    });
  } else {
    // 4. Development: use full puppeteer
    const puppeteerFull = (await import("puppeteer")).default;
    browser = await puppeteerFull.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
  }

  return browser;
}

async function generatePdfViaPuppeteer(html: string, req: NextRequest): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setViewport({ width: 794, height: 1122, deviceScaleFactor: 1 });
  await page.emulateMediaType("screen");
  await page.setContent(html, { waitUntil: ["domcontentloaded", "load"], timeout: 60000 });

  // Wait for fonts and images
  await page.evaluate(async () => {
    if ((document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }
    const images = Array.from(document.images || []);
    await Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            })
      )
    );
  });

  const pdf = await page.pdf({
    width: "8.5in",
    height: "11in",
    landscape: false,
    preferCSSPageSize: false,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:1px;"></div>',
    footerTemplate: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; width: 100%; 
                  padding: 0 40px; display: flex; justify-content: space-between; 
                  align-items: center; border-top: 1px solid #e5e7eb; padding-top: 4px;">
        <div style="font-size: 7.5px; font-weight: 600; color: #0A52EF;">www.example.com</div>
        <div style="font-size: 7px; color: #94a3b8;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      </div>
    `,
    margin: { top: "20px", bottom: "40px", left: "20px", right: "20px" },
  });

  await browser.close();
  return pdf;
}
```

---

## 6. HTML Template Pattern

For server-side PDF generation, always include:

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  
  <!-- Critical: Base href for resolving absolute paths -->
  <base href="${origin}/"/>
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  
  <!-- Tailwind CSS (optional) -->
  <style>${tailwindCss}</style>
  
  <!-- Print-specific styles -->
  <style>
    body, .font-sans {
      font-family: 'Work Sans', system-ui, sans-serif !important;
      line-height: 1.3 !important;
      font-size: 10px !important;
    }
    @media print {
      @page { size: 8.5in 11in; margin: 0; }
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>
```

---

## 7. React to HTML Pattern (Server-Side)

```typescript
import ReactDOMServer from "react-dom/server";
import { YourTemplate } from "./templates/YourTemplate";

function renderReactToHtml(template: React.FC<Props>, props: Props, origin: string): string {
  const htmlTemplate = ReactDOMServer.renderToStaticMarkup(template(props));
  
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <base href="${origin}/"/>
  <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <style>body { font-family: 'Work Sans', sans-serif; }</style>
</head>
<body>${htmlTemplate}</body>
</html>`;
}
```

---

## 8. Next.js API Route Example

```typescript
// app/api/pdf/generate/route.ts
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { JSREPORT_URL, JSREPORT_USER, JSREPORT_PASSWORD } from "@/lib/variables";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 1. Build your HTML content
    const fullHtml = buildHtmlContent(body);
    
    // 2. Prepare jsreport payload
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (JSREPORT_USER && JSREPORT_PASSWORD) {
      headers["Authorization"] = `Basic ${Buffer.from(`${JSREPORT_USER}:${JSREPORT_PASSWORD}`).toString("base64")}`;
    }

    const jsreportPayload = {
      template: {
        engine: "none",
        recipe: "chrome-pdf",
        content: fullHtml,
        chrome: {
          printBackground: true,
          displayHeaderFooter: true,
          mediaType: "screen",
          waitForNetworkIdle: true,
          marginTop: "20px",
          marginBottom: "40px",
          marginLeft: "20px",
          marginRight: "20px",
          width: "8.5in",
          height: "11in",
          landscape: false,
        },
      },
    };

    // 3. Call jsreport
    const response = await fetch(`${JSREPORT_URL}/api/report`, {
      method: "POST",
      headers,
      body: JSON.stringify(jsreportPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "PDF generation failed", details: errorText },
        { status: 502 }
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    // 4. Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=document.pdf",
        "Cache-Control": "no-cache",
      },
      status: 200,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error.message },
      { status: 500 }
    );
  }
}
```

---

## 9. Required Dependencies

### For jsreport approach:
```json
{
  "dependencies": {
    // No special dependencies - just fetch API
  }
}
```

### For Puppeteer approach:
```json
{
  "dependencies": {
    "puppeteer": "^22.0.0",
    "puppeteer-core": "^22.0.0",
    "@sparticuz/chromium": "^130.0.0"  // For serverless/production
  }
}
```

---

## 10. Docker Services (docker-compose.yml)

```yaml
services:
  # jsreport server
  jsreport:
    image: jsreport/jsreport:4
    ports:
      - "5488:5488"
    environment:
      - extensions_authentication_admin_username=admin
      - extensions_authentication_admin_password=admin
    volumes:
      - jsreport_data:/jsreport/data

  # Browserless (remote Chrome)
  browserless:
    image: browserless/chrome:latest
    ports:
      - "3000:3000"
    environment:
      - MAX_CONCURRENT_SESSIONS=10
      - CONNECTION_TIMEOUT=60000

volumes:
  jsreport_data:
```

---

## 11. Quick Reference

| Item | Value |
|------|-------|
| jsreport API | `POST ${JSREPORT_URL}/api/report` |
| Auth | Basic Auth (base64 `user:password`) |
| Recipe | `chrome-pdf` |
| Engine | `none` (raw HTML) or `handlebars` |
| Puppeteer Fallback | Browserless → Local Chromium |
| Max Duration | 60 seconds |

---

## 12. Source Files Reference

- Configuration: [`lib/variables.ts:23-28`](lib/variables.ts:23)
- jsreport Route: [`app/api/proposals/generate-jsreport/route.ts`](app/api/proposals/generate-jsreport/route.ts)
- Puppeteer Service: [`services/proposal/server/generateProposalPdfServiceV2.ts`](services/proposal/server/generateProposalPdfServiceV2.ts)
- Performance PDF: [`app/api/performance/reports/[id]/pdf/route.ts`](app/api/performance/reports/[id]/pdf/route.ts)
