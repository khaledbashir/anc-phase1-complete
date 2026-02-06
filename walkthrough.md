# Save Sequence Fix Verification

## Changes Implemented
1.  **Strict Project Creation Sequence**: Refactored `saveDraft` in `ProposalContext.tsx` to enforce the following order for new projects:
    -   Create Workspace (get Project ID).
    -   **Re-import Excel** (if a file was recently uploaded) to ensure the latest data is in memory.
    -   **Full PATCH Save** (screens, pricing, margin analysis) to the database.
    -   Navigate to the Project Page.
2.  **Explicit Save on Excel Import**: Modified `importANCExcel` to:
    -   Track the last uploaded file (`lastImportedFileRef`).
    -   Immediately trigger a `saveDraft` for **existing** projects to prevent data loss if the user navigates away before auto-save fires.
    -   Allow skipping `saveDraft` when called recursively during the new project creation flow.

## Verification Steps

### 1. New
# Walkthrough - Fixing Screen Mapping and Debugging Functionality

This document tracks the verification and fix process for the Screen Name Mapping bug and the "Brief Me" / "Download Bundle" functionality issues.

## Debugging "Brief Me" and "Download Bundle"
### Issue Description
- **Brief Me:** UI shows "Failed to generate brief" with a generic error.
- **Download Bundle:** User reported "unable to owlod bundl". Likely browser blocking multiple downloads.

### Investigation & Fixes
- **Download Bundle:**
  - **Findings:** The original implementation attempted to trigger 4 separate downloads sequentially. Modern browsers block automatic downloads after the first one.
  - **Fix:** Implemented client-side bundling using `jszip`. Now all PDFs and the Excel audit are fetched, zipped, and downloaded as a single `.zip` file.
-### 3. Live Preview Overrides & UI Fixes (Implemented & Pushed)
- **Problem:** Users could not rename headers, edit notes, or type efficiently due to input lag. Toggles were also "missing" (collapsed by default).
- **Fix:**
  - **Input Performance:** Refactored `PricingTableEditor.tsx` to use local state (`DebouncedInput`), preventing re-renders on every keystroke.
  - **Toggle Visibility:** Updated `Step4Export.tsx` to default the "Edit Document Text" panel to *Expanded*.
  - **Logic:** Implemented override lookups allowing users to rename pricing tables and add custom notes that reflect in the PDF.

### 4. Brief Me Functionality (Next Steps)
- **Status:** Investigating server port / 404 error.
- **Plan:** Verify `brief` generation endpoint once environment connectivity is stable.
- **Brief Me:**
  - **Findings:** Investigating API connectivity. `curl` to `localhost:3000` returned 404 from Easypanel, suggesting the app is running on a different port or intercepted.
  - **Next Steps:** Identifying the correct port and testing the `/api/agent/intelligence-brief` endpoint.

1.  Navigate to `/projects/new` (or click "Start Scratch").
2.  Upload an Excel file (e.g., `SBA PH4 Excel`).
3.  Wait for the preview to appear.
4.  Enter a Project Name (e.g., "Verification Test").
5.  Click **Save / Next**.
6.  **Verify**:
    -   You are redirected to the project page.
    -   The console logs should show: `[SAVE_DRAFT] Re-importing Excel for new project ID: ...`.
    -   **Refresh the page**. The data (Screens, Pricing Tables) should persist.

### 2. Existing Project Update
This verifies that uploading a new Excel file to an existing project saves immediately.

1.  Open an existing project.
2.  Upload a *different* Excel file.
3.  **Verify**:
    -   The console logs should show: `[EXCEL IMPORT] Pre-saveDraft state: ...`.
    -   **Refresh the page**. The new data should be present.
