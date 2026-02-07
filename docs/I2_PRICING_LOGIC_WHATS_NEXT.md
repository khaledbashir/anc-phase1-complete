# I2 Pricing Logic — What It Is, What’s Next, What to Tell Natalia

## In one sentence

**I2 is the “brain” we’re building so the app can eventually build quotes from scratch (Intelligence Mode) instead of only mirroring Excel.** Right now it’s just the database and one API — no UI, no change for Natalia yet.

---

## What’s built (done)

| Thing | What it is | Who uses it today |
|-------|------------|--------------------|
| **Database tables** | Categories, questions, answers, formulas (e.g. LED → Indoor/Outdoor → Pixel pitch → Manufacturer → price formula) | Nobody — it’s backend only |
| **Seed data** | One example tree: LED with Indoor/Outdoor, 1.5mm/3.9mm, LG/Yaham and simple formulas | Nobody — just sample data |
| **API** | `GET /api/pricing-logic/tree?categoryId=...` returns that tree as JSON | Only developers / future AI — no button in the app |

So: **foundation is in place. No new screens, no new workflow for users yet.**

---

## How it will eventually work (future)

**Today (Mirror Mode — Natalia):**  
Upload Excel → app shows exactly what’s in the file → download PDF. No “brain,” just copy.

**Later (Intelligence Mode — Matt/Jeremy + AI):**  
- **Option A – Human:** They pick category (e.g. LED), answer questions (Indoor/Outdoor, pixel pitch, manufacturer), app looks up the formula and calculates price.  
- **Option B – AI:** RFP says “indoor LED, 1.5mm, 100 sq ft” → AI walks the same tree, finds the right formula, plugs in numbers, adds a line item to the proposal.

The **same tree** (questions + answers + formulas) is used by both humans (in a future UI) and by the AI. I2 is that tree in the database.

---

## What to tell Natalia (and when)

**Right now:**  
You don’t have to tell her anything about I2. Her workflow is unchanged: upload Excel → pick doc type → preview → download PDF. No new training, no new screens.

**When we add the Tree Editor (later):**  
Then you can say something like:

- “We added a place where we can map how we actually price things — e.g. LED: indoor vs outdoor, pixel pitch, manufacturer. You (or Matt/Jeremy) can add questions and attach the pricing rules. The same rules will be used when we let the system suggest line items from an RFP.”

**When Intelligence Mode is live:**  
- “You can still do everything the way you do now with Excel (Mirror Mode). For builds-from-scratch, we now have Intelligence Mode: you answer a few questions or paste RFP text, and the system suggests line items and prices using the rules we set up in the pricing tree.”

---

## What you (Ahmad) do now

| Now | Later |
|-----|--------|
| Nothing user-facing. I2 is backend only. | When ready: build a simple “Tree Viewer” page (see the LED tree). |
| Optional: run the seed on production DB so the API returns the example tree after deploy. | Then: “Tree Editor” for Natalia/Matt/Jeremy to add questions, answers, formulas. |
| You can show stakeholders: “We have the data structure and API for the pricing brain; next is the UI and wiring it into the proposal flow.” | Then: wire that tree into the AI/Intelligence flow so it can auto-generate line items from RFP text. |

---

## How users will use it (when it’s built)

| User | How they’ll use it |
|------|--------------------|
| **Natalia** | Mostly unchanged. Optionally: help define or tweak the tree (questions + formulas) so Mirror Mode and future Intelligence Mode both match how ANC really prices. |
| **Matt / Jeremy** | Use the tree to build quotes without Excel: pick category, answer questions, get a price; or later, paste RFP and let AI suggest items from the same tree. |
| **AI** | Reads RFP → walks the tree (Indoor/Outdoor, pitch, manufacturer, etc.) → gets formula → computes price → adds line to proposal. |

---

## Short version for you

- **I2 = pricing logic database + API.** No UI yet, no change for Natalia.
- **Tell Natalia:** Nothing for now; when we add the tree editor we’ll explain it’s where we define how we price things for the “build from scratch” mode.
- **You:** No user actions required. Next steps are: (1) Tree Viewer, (2) Tree Editor, (3) Wire tree into Intelligence Mode / AI.
