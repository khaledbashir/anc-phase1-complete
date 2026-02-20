import json
import time
import os
import tempfile
from typing import Optional, List, Set, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
from keyword_bank import KEYWORD_BANK, score_page

app = FastAPI()

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://basheer-rag.prd42b.easypanel.host",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

def get_recommendation(score: float, classification: str) -> str:
    if classification == "drawing":
        return "review"
    if score >= 0.3:
        return "keep"
    if score > 0:
        return "maybe"
    return "discard"

@app.post("/api/triage")
async def triage_pdf(
    file: UploadFile = File(...),
    custom_keywords: Optional[str] = Query(None),
    disabled_categories: Optional[str] = Query(None)
):
    start_time = time.time()
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    # Read custom keywords and disabled categories
    disabled_cats_set = set()
    if disabled_categories:
        disabled_cats_set = {cat.strip() for cat in disabled_categories.split(",") if cat.strip()}
    
    local_kw_bank = KEYWORD_BANK.copy()
    if custom_keywords:
        custom_kw_list = [kw.strip() for kw in custom_keywords.split(",") if kw.strip()]
        if custom_kw_list:
            local_kw_bank["custom"] = custom_kw_list
            
    # Process PDF file using a temporary file
    temp_fd, temp_path = tempfile.mkstemp(suffix=".pdf")
    os.close(temp_fd)
    
    pages_result = []
    text_pages_count = 0
    drawing_pages_count = 0
    total_pages = 0
    
    try:
        # Write to temp file chunk by chunk to avoid loading entirely in memory
        with open(temp_path, "wb") as f:
            while True:
                chunk = await file.read(8192)
                if not chunk:
                    break
                f.write(chunk)
                
        # Check file size
        if os.path.getsize(temp_path) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max size is 500MB.")
        
        # Open and process the PDF
        with fitz.open(temp_path) as doc:
            total_pages = len(doc)
            for page_idx, page in enumerate(doc):
                text = page.get_text()
                
                score_info = score_page(text, local_kw_bank, disabled_cats_set)
                
                if score_info["classification"] == "text":
                    text_pages_count += 1
                else:
                    drawing_pages_count += 1
                
                pages_result.append({
                    "page_num": page_idx + 1,
                    "classification": score_info["classification"],
                    "score": score_info["score"],
                    "text_length": len(text) if text else 0,
                    "matched_keywords": score_info.get("matched_keywords", []),
                    "matched_categories": score_info.get("matched_categories", []),
                    "snippet": score_info.get("snippet", ""),
                    "recommended": get_recommendation(score_info["score"], score_info["classification"])
                })
    
    except fitz.FileDataError:
        raise HTTPException(status_code=400, detail="Invalid or corrupt PDF file.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Always remove temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
    
    processing_time_ms = int((time.time() - start_time) * 1000)
    
    return {
        "filename": file.filename,
        "total_pages": total_pages,
        "text_pages": text_pages_count,
        "drawing_pages": drawing_pages_count,
        "processing_time_ms": processing_time_ms,
        "pages": pages_result
    }

@app.post("/api/extract")
async def extract_pages(
    file: UploadFile = File(...),
    pages: str = Form(...)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        pages_list = json.loads(pages)
        if not isinstance(pages_list, list) or not all(isinstance(p, int) for p in pages_list):
            raise ValueError()
    except ValueError:
        raise HTTPException(status_code=400, detail="Pages must be a JSON array of integers.")
        
    temp_fd, temp_path = tempfile.mkstemp(suffix=".pdf")
    os.close(temp_fd)
    
    out_fd, out_path = tempfile.mkstemp(suffix=".pdf")
    os.close(out_fd)
    
    try:
        with open(temp_path, "wb") as f:
            while True:
                chunk = await file.read(8192)
                if not chunk:
                    break
                f.write(chunk)
                
        if os.path.getsize(temp_path) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max size is 500MB.")
            
        with fitz.open(temp_path) as doc:
            new_doc = fitz.open()
            
            # The requested pages are 1-indexed
            req_pages = [p - 1 for p in pages_list if 1 <= p <= len(doc)]
            
            if not req_pages:
                new_doc.close()
                raise HTTPException(status_code=400, detail="No valid pages to extract.")
                
            new_doc.insert_pdf(doc, from_page=req_pages[0], to_page=req_pages[0]) # init
            if len(req_pages) > 1:
                # Need to add individually since insert_pdf works mainly with ranges and might not handle non-contiguous well
                # Actually insert_pdf can handle a list of pages if passed one by one, wait, it's better to use select()
                pass
                
            # A better way to extract specific pages is select()
            doc.select(req_pages)
            doc.save(out_path)
            
            # Close new_doc since we didn't use it, we mutated doc via select() and saved it
            new_doc.close()

        # The FileResponse should not be returned before cleaning up if we want to clean up manually.
        # But FastAPI BackgroundTasks is better. 
        # Alternatively, FileResponse doesn't delete after serving unless used with background tasks.
        # Let's use BackgroundTasks to delete the files.
        pass
    except fitz.FileDataError:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(out_path):
            os.remove(out_path)
        raise HTTPException(status_code=400, detail="Invalid or corrupt PDF file.")
    except HTTPException:
        # Re-raise HTTPExceptions
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(out_path):
            os.remove(out_path)
        raise
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(out_path):
            os.remove(out_path)
        raise HTTPException(status_code=500, detail=str(e))
    
    # Clean up temp_path
    if os.path.exists(temp_path):
        os.remove(temp_path)

    # Note: FileResponse can take a background= task to clean up the out_path
    from starlette.background import BackgroundTask
    
    def cleanup_file():
        if os.path.exists(out_path):
            os.remove(out_path)
            
    return FileResponse(
        out_path, 
        media_type="application/pdf", 
        filename=f"extracted_{file.filename}",
        background=BackgroundTask(cleanup_file)
    )
