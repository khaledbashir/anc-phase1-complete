# Export all PDF template variants

This downloads **9 PDFs**: every combination of document mode (Budget, Proposal, LOI) and template (Classic, Modern, Bold) into `exported-pdfs/`.

Filenames follow: **{Client Name} {Document Type} {Template Name}.pdf**  
Example: `PDF-TEST Letter of Intent Classic.pdf`. Set `CLIENT_NAME` to override the client name (default: "Demo Client").

## 1. Run the download script

The script calls the app’s PDF API, so **the app must be running** when you run the script. If you see `404` or "Route POST:/api/proposal/generate not found", the app was not running at BASE_URL.

**Option A – App running locally**

```bash
cd invoify
pnpm run dev
# In another terminal (same machine):
pnpm run download-pdfs
```

**Option B – Use your deployed app (recommended on VPS)**

PDF generation needs Chrome or **Browserless**. On the VPS, the deployed app (EasyPanel) already has `BROWSERLESS_URL` set, so run the script **against that URL** (no need to run the app locally):

```bash
cd invoify
BASE_URL=https://basheer-rag.prd42b.easypanel.host pnpm run download-pdfs
```

Replace with your real invoify app URL if different. The PDFs are generated on the deployed server (which has Browserless).

**Option C – App running locally on the VPS (same machine as script)**

If you run the app with `pnpm run dev` on the VPS, use the port it prints (e.g. 3002):

```bash
BASE_URL=http://localhost:3002 pnpm run download-pdfs
```

PDF generation still needs a browser: set **BROWSERLESS_URL** in `.env` (e.g. your EasyPanel Browserless URL) so the app uses Browserless instead of local Chrome. Otherwise you’ll get “Could not find Chrome” 500 errors.

Output: `invoify/exported-pdfs/` with files like:

- `Demo Client Budget Classic.pdf`, `Demo Client Budget Modern.pdf`, …
- `Demo Client Proposal Classic.pdf`, …
- `Demo Client Letter of Intent Classic.pdf`, …

Use `CLIENT_NAME="PDF-TEST"` (or any name) to get e.g. `PDF-TEST Letter of Intent Classic.pdf`.

---

## 2. Copy from VPS to your computer

Replace `USER`, `VPS_HOST`, and `/path/to/invoify` with your SSH user, hostname/IP, and the real path to the app on the VPS.

**Copy the whole folder (e.g. into current directory):**

```bash
scp -r USER@VPS_HOST:/path/to/invoify/exported-pdfs ./exported-pdfs
```

**Example:**

```bash
scp -r root@192.168.1.100:/root/natalia/invoify/exported-pdfs ./exported-pdfs
```

**Using rsync (good for re-running and only updating changed files):**

```bash
rsync -avz USER@VPS_HOST:/path/to/invoify/exported-pdfs/ ./exported-pdfs/
```

**If your SSH key has a non-default path:**

```bash
scp -i ~/.ssh/my_key -r USER@VPS_HOST:/path/to/invoify/exported-pdfs ./exported-pdfs
```

After this, `./exported-pdfs` on your machine will contain all 9 PDFs.
