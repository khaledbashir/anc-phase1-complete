export interface TriagePage {
    page_num: number;
    classification: "text" | "drawing";
    score: number;
    text_length: number;
    matched_keywords: string[];
    matched_categories: string[];
    snippet: string;
    recommended: "keep" | "maybe" | "discard" | "review";
}

export interface TriageResponse {
    filename: string;
    total_pages: number;
    pages: TriagePage[];
}

const TRIAGE_API = "/api/pdf-triage";

export async function triagePdf(
    file: File,
    disabledCategories?: string[]
): Promise<TriageResponse> {
    const formData = new FormData();
    formData.append('file', file);

    let url = `${TRIAGE_API}/api/triage`;
    if (disabledCategories?.length) {
        url += `?disabled_categories=${disabledCategories.join(',')}`;
    }

    const res = await fetch(url, { method: 'POST', body: formData, credentials: 'omit' });
    if (!res.ok) {
        let errDetail = await res.text();
        try {
            const js = JSON.parse(errDetail);
            if (js.detail) errDetail = js.detail;
        } catch (e) { }
        throw new Error(`Triage failed: ${res.status} - ${errDetail}`);
    }
    return res.json();
}

export async function extractPages(
    file: File,
    pageNumbers: number[]
): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pages', JSON.stringify(pageNumbers));

    const res = await fetch(`${TRIAGE_API}/api/extract`, { method: 'POST', body: formData, credentials: 'omit' });
    if (!res.ok) {
        let errDetail = await res.text();
        try {
            const js = JSON.parse(errDetail);
            if (js.detail) errDetail = js.detail;
        } catch (e) { }
        throw new Error(`Extract failed: ${res.status} - ${errDetail}`);
    }
    return res.blob();
}

export async function healthCheck(): Promise<boolean> {
    try {
        const res = await fetch(`${TRIAGE_API}/api/health`, { method: 'GET', cache: 'no-store', credentials: 'omit' });
        return res.ok;
    } catch {
        return false;
    }
}

export interface ScreenSpec {
    source_page: number;
    source_type: "text" | "drawing";
    screen_name: string;
    location: string;
    size: string;
    size_width_ft: number | null;
    size_height_ft: number | null;
    pixel_pitch_mm: number | null;
    resolution: string | null;
    indoor_outdoor: string;
    quantity: number;
    mounting_type: string | null;
    nits_brightness: number | null;
    special_requirements: string | null;
    confidence: number;
    raw_notes: string;
}

export interface ExtractionResponse {
    screens: ScreenSpec[];
    summary: {
        total_screens_found: number;
        from_text: number;
        from_drawings: number;
        text_pages_processed: number;
        drawing_pages_processed: number;
        processing_time_ms: number;
    };
}

export async function extractSpecs(
    file: File,
    triageResult: TriageResponse,
    projectContext?: string
): Promise<ExtractionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('triage_result', JSON.stringify(triageResult));

    if (projectContext) {
        formData.append('project_context', projectContext);
    }

    const res = await fetch(`${TRIAGE_API}/api/extract-specs`, {
        method: 'POST',
        body: formData,
        credentials: 'omit'
    });

    if (!res.ok) {
        let errDetail = await res.text();
        try {
            const js = JSON.parse(errDetail);
            if (js.detail) errDetail = js.detail;
        } catch (e) { }
        throw new Error(`Extraction failed: ${res.status} - ${errDetail}`);
    }

    return res.json();
}
