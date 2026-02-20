import re
import math

KEYWORD_BANK = {
    "display_hardware": [
        "led display", "led screen", "led wall", "video display", "video wall",
        "video board", "scoreboard", "ribbon board", "fascia", "marquee",
        "digital signage", "display system", "led module", "led panel",
        "led tile", "led cabinet", "direct view led", "dvled", "fine pitch",
        "narrow pixel pitch", "smd led", "cob led", "micro led",
        "transparent led", "flexible led", "curved display", "outdoor led",
        "indoor led", "led mesh", "led curtain", "led strip", "pixel board"
    ],
    "specs": [
        "pixel pitch", "pixel density", "resolution", "brightness", "nit",
        "candela", "contrast ratio", "refresh rate", "viewing angle",
        "viewing distance", "color depth", "bit depth", "grayscale",
        "gamut", "hdr", "ip rating", "ip65", "ip54", "ingress protection",
        "operating temperature", "power consumption", "wattage",
        "btu", "weight per panel", "panel dimension", "module size",
        "cabinet size", "aspect ratio", "scan rate", "uniformity",
        "mtbf", "mean time between failure", "lifespan", "lifecycle",
        "luminance", "chromaticity"
    ],
    "electrical": [
        "electrical", "power distribution", "power supply", "pdu",
        "circuit breaker", "amperage", "voltage", "120v", "208v", "240v",
        "480v", "single phase", "three phase", "conduit", "wire gauge",
        "awg", "junction box", "disconnect", "transformer", "ups",
        "uninterruptible", "backup power", "generator", "ground fault",
        "gfci", "arc fault", "nec", "electrical code", "load calculation",
        "demand factor", "cat5", "cat6", "cat6a", "fiber optic",
        "data cable", "ethernet", "network switch", "patch panel",
        "data drop", "data count", "fiber strand", "single mode",
        "multi mode", "hdmi", "sdi", "displayport", "dvi",
        "signal distribution", "video processor", "scaler", "switcher",
        "media player", "content management", "cms", "controller",
        "receiving card", "sending card"
    ],
    "structural": [
        "structural", "steel", "mounting", "bracket", "cleat",
        "z-clip", "unistrut", "framing", "sub-structure", "substrate",
        "rigging", "flyware", "truss", "hoist", "motor", "chain hoist",
        "load bearing", "dead load", "live load", "wind load",
        "seismic", "anchorage", "anchor bolt", "concrete embed",
        "welding", "galvanized", "powder coat", "stainless",
        "aluminum extrusion", "pe stamp", "structural engineer",
        "structural calculation", "deflection", "moment", "shear",
        "bearing plate", "base plate", "column", "beam",
        "cantilever", "outrigger"
    ],
    "installation": [
        "installation", "install", "labor", "man hours", "crew",
        "mobilization", "demobilization", "scaffolding", "lift",
        "boom lift", "scissor lift", "crane", "aerial work platform",
        "safety harness", "fall protection", "osha", "ppe",
        "commissioning", "testing", "alignment", "calibration",
        "training", "warranty", "maintenance", "service agreement",
        "preventive maintenance", "spare parts", "on-site support",
        "remote support", "noc", "network operations",
        "punch list", "substantial completion", "final completion",
        "certificate of occupancy", "closeout", "as-built",
        "shop drawing", "submittal"
    ],
    "control_data": [
        "control system", "control room", "noc", "network operations center",
        "content management", "cms", "scheduling software", "playlist",
        "novastar", "brompton", "colorlight", "dbstar",
        "video processor", "scaler", "switcher", "matrix switcher",
        "media server", "brightsign", "crestron", "extron",
        "dante", "artnet", "dmx", "rs232", "rs485", "tcp ip",
        "api integration", "remote monitoring", "snmp",
        "redundancy", "failover", "backup system"
    ],
    "permits_logistics": [
        "permit", "building permit", "electrical permit", "inspection",
        "code compliance", "building code", "fire code", "ada",
        "accessibility", "zoning", "variance", "hoa",
        "shipping", "freight", "crating", "packaging",
        "customs", "import", "tariff", "duty", "bonded warehouse",
        "staging", "laydown area", "storage", "receiving dock",
        "delivery schedule", "lead time", "manufacturing time",
        "production schedule"
    ],
    "commercial": [
        "bid form", "bid bond", "performance bond", "payment bond",
        "surety", "insurance", "certificate of insurance", "coi",
        "indemnification", "liability", "liquidated damages",
        "retainage", "retention", "change order", "rfi",
        "request for information", "addendum", "amendment",
        "scope of work", "sow", "specification", "division 11",
        "division 10", "division 26", "division 27", "division 28",
        "csi", "masterformat", "prevailing wage", "davis bacon",
        "union", "non union", "minority participation", "mbe", "wbe",
        "dbe", "subcontractor", "general contractor", "owner",
        "architect", "consultant", "engineer of record",
        "base bid", "alternate", "option", "allowance",
        "unit price", "lump sum", "guaranteed maximum price", "gmp",
        "cost plus", "time and materials", "milestone", "phase",
        "schedule of values", "pay application", "invoice",
        "net 30", "net 60", "progress payment"
    ],
    "manufacturers": [
        "lg", "samsung", "daktronics", "watchfire", "yaham",
        "absen", "leyard", "planar", "unilumin", "roe visual",
        "barco", "christie", "nec", "sharp", "sony",
        "mitsubishi", "lighthouse", "sna displays", "nanolumens",
        "optec", "formetco", "vanguard", "dicolor", "aoto",
        "infiled", "novastar", "colorlight", "brompton",
        "megapixel vr", "elation", "martin", "chauvet"
    ]
}

def normalize_text(text: str) -> str:
    """Lowercase, strip punctuation (keep alphanumeric + spaces), collapse whitespace."""
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def score_page(text: str, keyword_bank: dict, disabled_categories: set = None) -> dict:
    """
    Score a single page's text against the keyword bank.
    Returns score, matched keywords, matched categories, and snippet.
    """
    if not text or len(text.strip()) < 50:
        return {
            "classification": "drawing",
            "score": 0.0,
            "matched_keywords": [],
            "matched_categories": [],
            "snippet": ""
        }
    
    normalized = normalize_text(text)
    hits = 0
    matched_keywords = []
    matched_categories = set()
    
    for category, keywords in keyword_bank.items():
        if disabled_categories and category in disabled_categories:
            continue
        for kw in keywords:
            # Whole-word/phrase boundary match
            pattern = r'\b' + re.escape(kw.lower()) + r'\b'
            count = len(re.findall(pattern, normalized))
            if count > 0:
                hits += count
                matched_keywords.append(kw)
                matched_categories.add(category)
    
    text_length = len(normalized)
    score = hits / math.sqrt(text_length) if text_length > 0 else 0.0
    
    # Generate snippet: first 200 chars of original text
    snippet = text.strip()[:200].replace('\n', ' ')
    
    return {
        "classification": "text",
        "score": round(score, 4),
        "matched_keywords": matched_keywords,
        "matched_categories": list(matched_categories),
        "snippet": snippet
    }
