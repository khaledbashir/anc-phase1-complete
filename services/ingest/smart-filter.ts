const pdf = require('pdf-parse');

// Keywords that indicate "Signal" (Technical/Pricing content)
const SIGNAL_KEYWORDS = [
  "schedule", "pricing", "bid form", "display", "led", "specification", 
  "technical", "qty", "quantity", "pixel pitch", "resolution", "nits", "brightness",
  "cabinet", "module", "diode", "refresh rate", "viewing angle", "warranty",
  "spare parts", "maintenance", "structural", "steel", "weight", "lbs", "kg",
  "power", "voltage", "amps", "circuit", "data", "fiber", "cat6"
];

// Keywords that indicate "Noise" (Legal/Boilerplate)
const NOISE_KEYWORDS = [
  "indemnification", "insurance", "liability", "termination", "arbitration",
  "force majeure", "governing law", "jurisdiction", "severability", "waiver",
  "confidentiality", "intellectual property", "compliance", "equal opportunity",
  "harassment", "drug-free", "background check"
];

interface PageContent {
  pageIndex: number;
  text: string;
  score: number;
  isDrawingCandidate: boolean;
}

export interface FilterResult {
  fullText: string;
  filteredText: string;
  retainedPages: number;
  totalPages: number;
  drawingCandidates: number[];
}

/**
 * Smart Filter Service
 * Analyzes PDF content and filters out "noise" pages (legal, boilerplate)
 * while retaining "signal" pages (specs, pricing, drawings).
 */
export async function smartFilterPdf(fileBuffer: Buffer): Promise<FilterResult> {
  const pages: PageContent[] = [];
  
  // Custom render function to capture text per page
  const renderPage = (pageData: any) => {
    // Extract text from the page
    const text = pageData.getTextContent();
    
    return text.then((textContent: any) => {
      let lastY, textStr = '';
      for (let item of textContent.items) {
        if (lastY == item.transform[5] || !lastY){
          textStr += item.str;
        }  
        else{
          textStr += '\n' + item.str;
        }    
        lastY = item.transform[5];
      }
      
      return textStr;
    });
  };

  const options = {
    pagerender: renderPage
  }

  // NOTE: pdf-parse's default behavior concatenates everything.
  // To get per-page control, we might need a more advanced parser like 'pdfjs-dist' directly.
  // However, 'pdf-parse' exposes a 'max' option and 'version' info, but the 'pagerender' 
  // returns a string that gets concatenated.
  
  // WORKAROUND: We will use the main text and try to split by standard PDF page breaks if possible,
  // OR we rely on a custom implementation. 
  // Since 'pdf-parse' is limited for per-page extraction without hacking, 
  // we will try to implement a simple scoring on the *whole* text first, 
  // OR use the 'pagerender' to build our own array via side-effects.

  const pageTexts: string[] = [];
  
  const optionsWithSideEffect = {
    pagerender: async (pageData: any) => {
        const textContent = await pageData.getTextContent();
        let pageText = '';
        for (let item of textContent.items) {
            pageText += item.str + ' ';
        }
        
        // Side effect: store page text
        pageTexts.push(pageText);
        
        return pageText;
    }
  };

  try {
    const data = await pdf(fileBuffer, optionsWithSideEffect);
    
    // Now we have pageTexts populated
    let filteredContent = "";
    let retainedCount = 0;
    const drawingCandidates: number[] = [];

    pageTexts.forEach((text, index) => {
      const lowerText = text.toLowerCase();
      let score = 0;

      // Scoring Logic
      SIGNAL_KEYWORDS.forEach(kw => {
        if (lowerText.includes(kw)) score += 10;
      });

      NOISE_KEYWORDS.forEach(kw => {
        if (lowerText.includes(kw)) score -= 5;
      });

      // Drawing Detection Heuristic:
      // Low text count (< 200 chars) but contains keywords like "scale", "detail", "dwg"
      const isDrawing = text.length < 500 && 
                        (lowerText.includes("scale") || lowerText.includes("detail") || lowerText.includes("elevation") || lowerText.includes("drawing"));
      
      if (isDrawing) {
        drawingCandidates.push(index + 1); // 1-based index
        score += 20; // Boost drawings
      }

      // Threshold
      if (score > 0) {
        filteredContent += `\n--- PAGE ${index + 1} (Score: ${score}) ---\n${text}\n`;
        retainedCount++;
      }
    });

    return {
      fullText: data.text,
      filteredText: filteredContent,
      retainedPages: retainedCount,
      totalPages: data.numpages,
      drawingCandidates
    };

  } catch (error) {
    console.error("Smart Filter Error:", error);
    throw error;
  }
}
