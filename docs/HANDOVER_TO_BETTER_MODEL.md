# Project Status & Handover: Invoify

## Current Status & Outstanding Issues

The application is currently functional but suffers from specific UI/UX regressions and fragility, particularly concerning theming and reactive data binding.

### 1. Theme Inconsistency (Light/Dark Mode)
- **Issue:** The application mixes hardcoded dark styles (e.g., `zinc-950`) with semantic Tailwind variables. This leads to visual bugs such as "Black Tables on White Pages" or "Invisible Text" when switching between Light and Dark modes.
- **Current State:** Recent attempts to refactor components like `Step1Ingestion.tsx`, `ProjectCard.tsx`, and `ExcelViewer.tsx` to use semantic tokens (`bg-card`, `text-foreground`) have had mixed results. A global CSS override was attempted in `app/globals.css` to force light-mode styles, but this may be causing conflicts.
- **Recommendation:** A complete audit of the codebase is required to replace all hardcoded color values (`bg-zinc-*`, `bg-black`, `text-zinc-*`, `text-white`) with Shadcn/Tailwind semantic variables (`bg-background`, `text-foreground`, `border-border`).

### 2. PDF Data Synchronization (Reactive Binding)
- **Issue:** Changes made in the `ExcelViewer` (e.g., editing display names or prices) do not consistently propagate to the PDF Preview in real-time.
- **Context:** The PDF generation (`ProposalTemplate2.tsx`) relies on state shared via `ProposalContext`. Previous refactoring attempted to implement "direct reactive binding" where the PDF reads directly from the `details.screens` state. However, issues with stale data or duplicated line items suggest the sync mechanism is not fully robust.
- **Recommendation:** Ensure `useProposalContext()` is the single source of truth. Validations should confirm that an edit in the Excel grid triggers an immediate context update and a corresponding re-render of the PDF component.

### 3. General Stability
- **Issue:** Rapid iteration on UI styling has introduced regressions. Fixes for one component (e.g., background color) occasionally unintentionally affect others (e.g., text contrast).
- **Recommendation:** Implement a more rigorous testing strategy or rely on a centralized theme definition rather than ad-hoc component overrides.

### 4. Technical Context
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + Shadcn UI
- **Critical Files:**
    - `app/globals.css`: Currently contains emergency CSS overrides.
    - `app/components/proposal/form/wizard/steps/Step1Ingestion.tsx`: "Ingestion Studio" UI.
    - `app/components/ExcelViewer.tsx`: Data display component.
    - `app/components/templates/proposal-pdf/ProposalTemplate2.tsx`: Core PDF generation logic.
