import os
import httpx
import json

Z_AI_API_KEY = os.environ.get("Z_AI_API_KEY", "")
Z_AI_VISION_BASE_URL = os.environ.get("Z_AI_VISION_BASE_URL", "https://api.z.ai/api/paas/v4")
Z_AI_URL = f"{Z_AI_VISION_BASE_URL}/chat/completions"

ANYTHINGLLM_URL = os.environ.get("ANYTHINGLLM_URL", "https://basheer-anything-llm.prd42b.easypanel.host")
ANYTHINGLLM_API_KEY = os.environ.get("ANYTHINGLLM_API_KEY", "")


async def extract_from_drawing(images: list[dict], project_context: str = "") -> dict:
    """Send drawing images to GLM-4.6V for screen extraction."""
    
    results = []
    
    for img in images:
        prompt_text = f"""You are an LED display specification extractor for construction RFPs. 
You analyze architectural drawings and floor plans to identify LED displays, video boards, 
scoreboards, ribbon boards, digital signage, and similar display systems.

For each display you find, extract:
- screen_name: What the display is labeled as (e.g. "Main Videoboard", "Ribbon Board East")
- location: Where in the venue (be specific: section numbers, elevation, orientation)
- size: Dimensions as shown (e.g. "40' x 22'")
- size_width_ft: Width in feet (number only)
- size_height_ft: Height in feet (number only)
- pixel_pitch_mm: If specified (null if not shown)
- resolution: If specified (null if not shown)
- indoor_outdoor: "indoor" or "outdoor" based on location context
- quantity: Number of this display type
- mounting_type: How it's mounted (steel, rigging, wall, etc.)
- nits_brightness: If specified (null if not shown)
- special_requirements: Any special notes (weatherproof, curved, transparent, etc.)
- confidence: 0.0-1.0 how confident you are this is an LED display
- raw_notes: Your detailed notes about what you see

Return a JSON array of screen objects. If no displays are found in the drawing, return an empty array.
Only return the JSON array, no other text.

Analyze this architectural drawing from an RFP{' for ' + project_context if project_context else ''}. Extract all LED display/video board specifications you can identify."""

        messages = [{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{img['base64']}"
                    }
                },
                {
                    "type": "text",
                    "text": prompt_text
                }
            ]
        }]
        
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                response = await client.post(
                    Z_AI_URL,
                    headers={
                        "Authorization": f"Bearer {Z_AI_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "glm-4.6v-flash",
                        "messages": messages,
                        "max_tokens": 4096,
                        "temperature": 0.1
                    }
                )
                
                response.raise_for_status()
                data = response.json()
                msg = data["choices"][0]["message"]
                text = msg.get("content") or ""
                reasoning = msg.get("reasoning_content") or ""
                full_response = text if text.strip() else reasoning
                
                # Parse JSON from response (handle markdown code blocks)
                cleaned = full_response.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
                
                try:
                    screens = json.loads(cleaned)
                    for screen in screens:
                        screen["source_page"] = img["page_num"]
                        screen["source_type"] = "drawing"
                    results.extend(screens)
                except json.JSONDecodeError:
                    # If JSON parse fails, store raw response as a single entry
                    results.append({
                        "source_page": img["page_num"],
                        "source_type": "drawing",
                        "screen_name": "PARSE_ERROR",
                        "raw_notes": full_response,
                        "confidence": 0.0
                    })
            except Exception as e:
                 results.append({
                    "source_page": img["page_num"],
                    "source_type": "drawing",
                    "screen_name": "API_ERROR",
                    "raw_notes": str(e),
                    "confidence": 0.0
                })
    
    return results

async def extract_from_text(pages: list[dict], project_context: str = "") -> dict:
    """Send text content to AnythingLLM (Gemini) for screen extraction."""
    if not pages:
        return []
        
    # Combine all text pages into one prompt (they're already filtered/relevant)
    combined_text = ""
    page_nums = []
    for p in pages:
        combined_text += f"\n\n--- PAGE {p['page_num']} ---\n{p['text']}"
        page_nums.append(p["page_num"])
    
    prompt = f"""Extract all LED display/screen specifications from this RFP text.
{f'This is for: {project_context}' if project_context else ''}

For each display/screen found, return a JSON object with these fields:
- screen_name: Display name (e.g. "Main Videoboard", "Fascia Ribbon Board")
- location: Where in the venue
- size: Dimensions as written (e.g. "40' x 22'", "3'-6\" high x 450' long")
- size_width_ft: Width in feet (number)
- size_height_ft: Height in feet (number)  
- pixel_pitch_mm: Pixel pitch in mm (number, null if not specified)
- resolution: Resolution (e.g. "1220 x 671", null if not specified)
- indoor_outdoor: "indoor" or "outdoor"
- quantity: How many of this display
- mounting_type: Mounting method
- nits_brightness: Brightness in nits (number, null if not specified)
- special_requirements: Any special requirements
- confidence: 0.0-1.0
- raw_notes: Relevant quote from the text
- source_page: The page number where this was found

Return ONLY a JSON array of screen objects. If no displays are found, return an empty array. No other text.

RFP TEXT:
{combined_text}"""

    async with httpx.AsyncClient(timeout=120) as client:
        try:
            response = await client.post(
                f"{ANYTHINGLLM_URL}/api/v1/workspace/rfp-extraction/chat",
                headers={
                    "Authorization": f"Bearer {ANYTHINGLLM_API_KEY}",
                    "Content-Type": "application/json",
                    "accept": "application/json"
                },
                json={
                    "message": prompt,
                    "mode": "chat"  # Direct chat, not RAG
                }
            )
            
            response.raise_for_status()
            data = response.json()
            content = data.get("textResponse", "")
            
            # Parse JSON
            cleaned = content.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
            
            try:
                screens = json.loads(cleaned)
                for screen in screens:
                    screen["source_type"] = "text"
                    if "source_page" not in screen or screen["source_page"] is None:
                        screen["source_page"] = page_nums[0] if page_nums else 0
                return screens
            except json.JSONDecodeError:
                return [{
                    "source_type": "text",
                    "screen_name": "PARSE_ERROR",
                    "raw_notes": content,
                    "confidence": 0.0,
                    "source_page": page_nums[0] if page_nums else 0
                }]
        except Exception as e:
            return [{
                "source_type": "text",
                "screen_name": "API_ERROR",
                "raw_notes": str(e),
                "confidence": 0.0,
                "source_page": page_nums[0] if page_nums else 0
            }]
