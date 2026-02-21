export interface TriagePage {
    page_num: number;
    source_filename?: string;
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
    files_processed: number;
    total_pages: number;
    text_pages: number;
    drawing_pages: number;
    processing_time_ms: number;
    pages: TriagePage[];
}

const TRIAGE_API = "https://basheer-triage.prd42b.easypanel.host";

export async function triagePdf(
    files: File[],
    onProgress?: (percent: number) => void,
    disabledCategories?: string[]
): Promise<TriageResponse> {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));

        let url = `${TRIAGE_API}/api/triage`;
        if (disabledCategories?.length) {
            url += `?disabled_categories=${disabledCategories.join(',')}`;
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);

        // This is where we get the REAL upload progress
        if (onProgress && xhr.upload) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    onProgress(percentComplete);
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText));
                } catch (e) {
                    reject(new Error("Failed to parse triage response"));
                }
            } else {
                let errDetail = xhr.responseText;
                try {
                    const js = JSON.parse(errDetail);
                    if (js.detail) errDetail = js.detail;
                } catch (e) { }
                reject(new Error(`Triage failed: ${xhr.status} - ${errDetail}`));
            }
        };

        xhr.onerror = () => {
            reject(new Error("Network error during triage upload"));
        };

        xhr.ontimeout = () => {
            reject(new Error("Triage upload timed out"));
        };

        // Increase timeout for massive files (Set to 10 minutes)
        xhr.timeout = 600000;

        xhr.send(formData);
    });
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
    files: File[],
    triageResult: TriageResponse,
    projectContext?: string
): Promise<ExtractionResponse> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
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
