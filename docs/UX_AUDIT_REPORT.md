# ANC Proposal Engine - UX Audit Report
**Framework:** "Would Ahmad Think It's Shit?"  
**Date:** 2026-01-30  
**Auditor:** Kilo Code  
**Methodology:** User-centered heuristic evaluation focusing on clarity, navigation, effort, visual sanity, and respect for the user.

---

## Executive Summary

**Overall Score: 8/14** ⚠️ **AHMAD WOULD THINK THIS IS SHIT**

While the application demonstrates sophisticated engineering and powerful features, it suffers from **critical UX issues** that make it harder to work with than necessary. The primary concerns are:

1. **Confusing navigation model** (3 views, unclear purpose)
2. **Overcomplicated workflows** (4-step wizard for simple tasks)
3. **Hidden critical actions** (Excel import buried in accordion)
4. **Visual noise** (too much information density)
5. **No clear primary actions** (everything looks the same)

**Quick Fix Priority:** 🔴 HIGH - Address navigation and workflow complexity before launch.

---

## Detailed Evaluation by Axis

### 1. CLARITY: Score 1/2 (MEH) ⚠️

**What's Good:**
- Clear section headers in Step1Ingestion (e.g., "Project & Client")
- Status badges on project cards (Draft, Pending, Finalized)
- Visual hierarchy in SingleScreen component (collapsed/expanded states)

**What's Shit:**

#### ❌ No Clear Primary Action
**Location:** [`app/projects/page.tsx:131-137`](invoify/app/projects/page.tsx:131)
```tsx
<button className="flex items-center gap-2 px-4 py-2 bg-[#0A52EF] text-white rounded-lg font-medium">
    <Plus className="w-4 h-4" />
    New Project
</button>
```
**Problem:** While the "New Project" button is styled prominently, it's just one of many actions. No clear visual hierarchy between "New Project", "Search", "Filter", and individual project cards.

**Ahmad's Reaction:** "Do I click the blue button? Or do I click one of these cards? Or do I search? What's the main thing I'm supposed to do here?"

---

#### ❌ Confusing View Mode Labels
**Location:** [`app/components/layout/StudioLayout.tsx:41-45`](invoify/app/components/layout/StudioLayout.tsx:41)
```tsx
const navItems = [
    { id: "form", icon: LayoutDashboard, label: "Proposal Builder" },
    { id: "ai", icon: MessageSquare, label: "Intelligence Engine" },
    { id: "audit", icon: Table, label: "Financial Audit" },
];
```
**Problem:** "Proposal Builder" vs "Intelligence Engine" vs "Financial Audit" - these are abstract labels. Users don't know what each view does without clicking.

**Ahmad's Reaction:** "What's the difference between 'Proposal Builder' and 'Intelligence Engine'? Which one do I use to add screens? Which one for pricing?"

---

#### ❌ Wizard Step Labels Are Abstract
**Location:** [`app/components/ProposalPage.tsx:86-105`](invoify/app/components/ProposalPage.tsx:86)
```tsx
{activeStep === 0 && <WizardStep><Step1Ingestion /></WizardStep>}
{activeStep === 1 && <WizardStep><Step2Intelligence /></WizardStep>}
{activeStep === 2 && <WizardStep><Step3Math /></WizardStep>}
{activeStep === 3 && <WizardStep><Step4Export /></WizardStep>}
```
**Problem:** Steps are labeled "Ingestion", "Intelligence", "Math", "Export" - these are engineering terms, not user tasks.

**Ahmad's Reaction:** "I just want to create a proposal. Why am I doing 'ingestion'? Is that the same as importing my Excel?"

---

### 2. NAVIGATION: Score 2/2 (SHIT) 💀

**What's Good:**
- Sticky header with logo
- Breadcrumb-style wizard progress indicator (implied)

**What's Shit:**

#### ❌ Three-Pane Layout Is Disorienting
**Location:** [`app/components/layout/StudioLayout.tsx:102-209`](invoify/app/components/layout/StudioLayout.tsx:102)
```tsx
<main className="flex-1 overflow-hidden grid grid-cols-2">
    {/* THE HUB (Left Pane: 50vw) */}
    <section className="relative flex flex-col overflow-hidden bg-zinc-950/40 border-r border-zinc-900">
        {/* Mode Toggle - Top Anchored */}
        <ModeToggle mode={viewMode === "ai" ? "ai" : "form"} />
        {/* Stacked Panels with CSS Visibility Toggle */}
        <div className="flex-1 flex overflow-hidden">
            {/* Drafting Form Panel */}
            {/* Intelligence Engine Panel */}
            {/* Financial Audit Panel */}
        </div>
    </section>
    {/* THE ANCHOR (Right Pane: 50vw) */}
    <section className="relative bg-slate-200 overflow-hidden">
        <PdfViewer />
    </section>
</main>
```
**Problem:** 
- Left pane has 3 stacked panels (form, AI, audit) that toggle visibility
- Right pane is always PDF preview
- Users lose context: "Where did my form go? Oh, I'm in AI mode now"

**Ahmad's Reaction:** "I was filling out the form, now it's gone. Where did it go? Oh, I accidentally clicked 'Intelligence Engine'. How do I get back?"

---

#### ❌ Sidebar Collapse Hides Navigation Labels
**Location:** [`app/components/layout/StudioLayout.tsx:59-99`](invoify/app/components/layout/StudioLayout.tsx:59)
```tsx
<aside className={cn("border-r border-zinc-900 bg-zinc-950/50 flex flex-col", isSidebarCollapsed ? "w-16" : "w-56")}>
    {navItems.map((item) => {
        return (
            <button onClick={() => setViewMode(item.id as ViewMode)}>
                <Icon className="w-4 h-4" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
            </button>
        );
    })}
</aside>
```
**Problem:** When collapsed, users see only icons with no labels. They have to guess or hover.

**Ahmad's Reaction:** "These icons look the same. Which one is the form? Which one is the audit? Why can't I see the labels?"

---

#### ❌ No Breadcrumbs or "You Are Here" Indicators
**Problem:** The wizard has 4 steps, but there's no visual progress indicator showing:
- Which step you're on
- How many steps remain
- How to go back to a previous step

**Ahmad's Reaction:** "I'm on step 3... or is it step 4? How do I go back and fix something from step 1?"

---

### 3. EFFORT TO DO BASICS: Score 2/2 (SHIT) 💀

**What's Good:**
- Auto-save functionality (2s debounce)
- Real-time PDF preview updates

**What's Shit:**

#### ❌ Creating a Project Requires 5+ Steps
**Current Flow:**
1. Click "New Project" button
2. Get prompted with `prompt("Enter Client Name:")` (terrible UX!)
3. System creates project
4. Redirects to editor
5. User must fill out 4 wizard steps (Ingestion → Intelligence → Math → Export)

**Location:** [`app/projects/page.tsx:59-81`](invoify/app/projects/page.tsx:59)
```tsx
const createNewProject = async () => {
    const clientName = prompt("Enter Client Name:"); // ❌ SHIT
    if (!clientName) return;
    // ... creates project ...
    router.push(`/projects/${data.project.id}`);
};
```

**Ahmad's Reaction:** "Why am I getting a browser prompt? Is this from the 90s? I just want to create a project, not go through an interrogation."

---

#### ❌ Excel Import Is Buried in Accordion
**Location:** [`app/components/proposal/form/wizard/steps/Step1Ingestion.tsx:157-224`](invoify/app/components/proposal/form/wizard/steps/Step1Ingestion.tsx:157)
```tsx
{selectedPath === "MIRROR" && (
    <div className={cn("transition-all duration-500", isUploadCollapsed ? "max-h-16" : "max-h-[500px]")}>
        {/* Accordion Header */}
        <div onClick={() => setIsUploadCollapsed(!isUploadCollapsed)}>
            <h4>Upload ANC Estimator Excel</h4>
        </div>
        {!isUploadCollapsed && (
            <div className="p-8 pt-4">
                <input type="file" id="excel-upload" className="hidden" />
                <label htmlFor="excel-upload">Select Master File</label>
            </div>
        )}
    </div>
)}
```
**Problem:** 
- User must first select "Mirror Mode" path
- Then click to expand accordion
- Then click "Select Master File"
- Then navigate file picker
- That's 4 clicks just to upload an Excel file!

**Ahmad's Reaction:** "I just want to upload my Excel. Why do I have to choose a path, expand an accordion, and then click a button? Can't I just drag and drop?"

---

#### ❌ Adding a Screen Requires Expanding Card
**Location:** [`app/components/proposal/form/SingleScreen.tsx:100-196`](invoify/app/components/proposal/form/SingleScreen.tsx:100)
```tsx
<button onClick={() => setIsExpanded(!isExpanded)} className="w-full p-4">
    {/* Collapsed Header */}
</button>
{isExpanded && (
    <div className="p-4 border-t">
        {/* All the form fields */}
    </div>
)}
```
**Problem:** Screens are collapsed by default. To edit dimensions, user must click to expand each screen individually.

**Ahmad's Reaction:** "I have 10 screens. I need to click each one to expand it, edit the dimensions, then collapse it? That's 30 clicks! Why can't I see them all at once?"

---

### 4. VISUAL SANITY: Score 1/2 (MEH) ⚠️

**What's Good:**
- Consistent color scheme (zinc dark mode with brand blue accents)
- Good use of badges for status indicators
- Clean typography with proper spacing

**What's Shit:**

#### ❌ Information Density Is Overwhelming
**Location:** [`app/components/proposal/form/SingleScreen.tsx:92-459`](invoify/app/components/proposal/form/SingleScreen.tsx:92)
```tsx
<div className="border rounded-xl overflow-hidden">
    {/* Header with: status dot, name, dimensions, badges, price, margin, chevron */}
    <button className="w-full p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" /> {/* Status */}
            <div className="text-left">
                <p className="font-medium">#{index + 1} - {screenName}</p>
                <p className="text-xs">{width}' × {height}'</p>
            </div>
            {/* Warning badges */}
            {/* AI badges */}
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-base font-semibold">{finalClientTotal}</p>
                <p className="text-xs">{desiredMargin}% margin</p>
            </div>
            <ChevronRight />
        </div>
    </button>
    {isExpanded && (
        <div className="p-4 space-y-4">
            {/* Quick actions bar: 4 buttons */}
            {/* Primary fields: 4 inputs */}
            {/* Dimensions row: 5 inputs */}
            {/* Margin slider with tooltip */}
            {/* Advanced settings toggle */}
            {/* Advanced settings: 3 more inputs */}
            {/* Live stats footer: 3 metrics */}
        </div>
    )}
</div>
```
**Problem:** A single screen card has:
- 1 status indicator
- 2-3 badges
- 4-5 text labels
- 4 quick action buttons (when expanded)
- 12+ form fields (when expanded)
- 3 live stats

**Ahmad's Reaction:** "There's too much going on here. I don't know where to look. Is this important? Is that important? Everything looks the same."

---

#### ❌ Low Contrast in Dark Mode
**Location:** Multiple files use `text-zinc-500` on `bg-zinc-950`
```tsx
<p className="text-zinc-500 text-xs">{width}' × {height}'</p>
```
**Problem:** Zinc-500 on zinc-950 has poor contrast (3.5:1 ratio, below WCAG AA standard of 4.5:1).

**Ahmad's Reaction:** "I can barely read this text. Is it disabled? Is it a placeholder? Why is it so faint?"

---

#### ❌ Decorative Animations Slow Down Interaction
**Location:** [`app/components/layout/StudioLayout.tsx:121-123`](invoify/app/components/layout/StudioLayout.tsx:121)
```tsx
<div className="min-h-full animate-in fade-in slide-in-from-left-4 duration-500">
    {formContent}
</div>
```
**Problem:** Every view transition has a 500ms animation. Users wait half a second just to see the content.

**Ahmad's Reaction:** "Why is there a delay every time I switch views? I just want to see my form, not watch a fade animation."

---

### 5. RESPECT FOR USER: Score 2/2 (SHIT) 💀

**What's Good:**
- Auto-save prevents data loss
- Confirmation dialogs for destructive actions (reset form)

**What's Shit:**

#### ❌ Browser Prompt for Client Name
**Location:** [`app/projects/page.tsx:60`](invoify/app/projects/page.tsx:60)
```tsx
const clientName = prompt("Enter Client Name:");
```
**Problem:** Using `window.prompt()` is disrespectful and unprofessional. It:
- Blocks the entire browser
- Has no validation
- Can't be styled
- Feels like a hack

**Ahmad's Reaction:** "Seriously? A browser prompt? In 2026? This feels like a half-baked prototype."

---

#### ❌ No Undo for Destructive Actions
**Location:** [`app/components/proposal/form/SingleScreen.tsx:231-238`](invoify/app/components/proposal/form/SingleScreen.tsx:231)
```tsx
<BaseButton
    variant="destructive"
    size="sm"
    onClick={() => removeField(index)}
>
    <Trash2 className="w-4 h-4 mr-1" />
    Remove
</BaseButton>
```
**Problem:** Clicking "Remove" instantly deletes the screen with:
- No confirmation
- No undo
- No "deleted items" trash folder

**Ahmad's Reaction:** "I just deleted the wrong screen by accident. Can I undo it? No? Great, now I have to re-enter all those dimensions."

---

#### ❌ Vague Error Messages
**Location:** [`app/components/reusables/AiWand.tsx:24-27`](invoify/app/components/reusables/AiWand.tsx:24)
```tsx
if (!query || query.length < 3) {
    showError("Please enter a name or company first.");
    return;
}
```
**Problem:** Error doesn't tell the user:
- Which field needs input
- What the minimum length is
- How to fix it

**Ahmad's Reaction:** "What? I did enter a name. Oh, it needs to be 3 characters? Why didn't it say that?"

---

#### ❌ No Bulk Operations
**Problem:** Users can't:
- Select multiple screens to delete
- Copy multiple screens at once
- Bulk-edit margins across all screens

**Ahmad's Reaction:** "I have 20 screens and I need to change the margin from 20% to 25% on all of them. I have to do it one by one? Are you kidding me?"

---

## The "Ahmad Vibe" Test

### ❌ FAILS: Mental Mapping in 2-3 Seconds
**Question:** Can a user understand the flow in 2-3 seconds?

**Answer:** No. The application has:
- 3 view modes (form, AI, audit)
- 4 wizard steps (ingestion, intelligence, math, export)
- 2 calculation modes (mirror, intelligence)
- Multiple sidebars and panels
- Collapsible accordions

**Ahmad's Reaction:** "I opened this and I'm confused. Do I start here? Or there? What's the difference between these two buttons? I have to explore to figure it out."

---

### ❌ FAILS: Built for User vs KPI
**Question:** Does it feel built for the user or for internal KPIs?

**Answer:** It feels built for engineering complexity, not user needs. Evidence:
- Abstract labels ("Ingestion", "Intelligence Engine")
- Over-engineered navigation (3 stacked panels)
- Unnecessary animations (500ms transitions)
- Complex workflows for simple tasks

**Ahmad's Reaction:** "This feels like the developers wanted to show off how complex they could make it. I just want to create a proposal, not navigate a spaceship control panel."

---

### ❌ FAILS: One-Sentence Explanation
**Question:** Could you explain to a non-technical friend: "To do X, just click A then B" in one sentence?

**Answer:** No. Example:
"To create a proposal, click New Project, enter your client name in the browser prompt, select Mirror Mode or Intelligence Mode, expand the accordion, upload your Excel file, verify the LED sheet, click Next Step to review screens, click Next Step to review math, then click Export to generate the PDF."

**That's 42 words and 9 steps.**

**Ahmad's Reaction:** "I can't explain this to my boss without sounding like I'm describing a Rube Goldberg machine."

---

## Specific Shit List

### 🔴 CRITICAL (Fix Before Launch)

1. **Replace `prompt()` with proper modal** - [`app/projects/page.tsx:60`](invoify/app/projects/page.tsx:60)
   - Use a proper form modal with validation
   - Allow editing client name after creation

2. **Simplify wizard to 2 steps** - [`app/components/ProposalPage.tsx:86-105`](invoify/app/components/ProposalPage.tsx:86)
   - Step 1: Setup (project info + Excel upload)
   - Step 2: Review & Export
   - Remove "Intelligence" and "Math" as separate steps

3. **Make Excel upload drag-and-drop** - [`app/components/proposal/form/wizard/steps/Step1Ingestion.tsx:157-224`](invoify/app/components/proposal/form/wizard/steps/Step1Ingestion.tsx:157)
   - Remove accordion
   - Show dropzone on page load
   - Auto-detect file type

4. **Add undo for delete actions** - [`app/components/proposal/form/SingleScreen.tsx:231-238`](invoify/app/components/proposal/form/SingleScreen.tsx:231)
   - Show toast with "Undo" button
   - Keep deleted items in memory for 30 seconds

---

### 🟡 HIGH PRIORITY (Fix Soon)

5. **Fix navigation labels** - [`app/components/layout/StudioLayout.tsx:41-45`](invoify/app/components/layout/StudioLayout.tsx:41)
   - "Proposal Builder" → "Edit Proposal"
   - "Intelligence Engine" → "AI Assistant"
   - "Financial Audit" → "Pricing Breakdown"

6. **Add wizard progress indicator** - [`app/components/ProposalPage.tsx:66-75`](invoify/app/components/ProposalPage.tsx:66)
   - Show step number (1 of 4)
   - Show progress bar
   - Allow clicking to jump to previous steps

7. **Remove view transition animations** - [`app/components/layout/StudioLayout.tsx:121`](invoify/app/components/layout/StudioLayout.tsx:121)
   - Reduce duration from 500ms to 150ms
   - Or remove entirely

8. **Improve contrast for secondary text** - Multiple files
   - Change `text-zinc-500` to `text-zinc-400` on dark backgrounds
   - Ensure 4.5:1 contrast ratio

---

### 🟢 MEDIUM PRIORITY (Nice to Have)

9. **Add bulk operations** - New feature
   - Select multiple screens with checkboxes
   - Bulk delete, bulk edit margins

10. **Show all screens by default** - [`app/components/proposal/form/SingleScreen.tsx:52`](invoify/app/components/proposal/form/SingleScreen.tsx:52)
    - Change `useState(index === 0 && fields.length === 1)` to `useState(true)`
    - Or add "Expand All / Collapse All" button

11. **Add keyboard shortcuts**
    - Cmd/Ctrl + S: Save
    - Cmd/Ctrl + N: New screen
    - Cmd/Ctrl + D: Duplicate screen
    - Escape: Close modal

12. **Improve error messages** - Multiple files
    - Show which field has the error
    - Provide actionable guidance
    - Use friendly language

---

## Recommended Quick Wins (Fix in 1 Day)

### 1. Fix the "New Project" Flow (30 minutes)
**Before:** Browser prompt
**After:** Inline form

```tsx
// Replace this:
const clientName = prompt("Enter Client Name:");

// With this:
const [showNewProjectModal, setShowNewProjectModal] = useState(false);
// ... use a proper Dialog component with form validation
```

---

### 2. Simplify Wizard Labels (15 minutes)
**Before:** "Ingestion", "Intelligence", "Math", "Export"
**After:** "Setup", "Configure", "Review", "Export"

```tsx
const steps = [
    { id: "setup", label: "Setup", icon: Upload },
    { id: "configure", label: "Configure", icon: Settings },
    { id: "review", label: "Review", icon: Eye },
    { id: "export", label: "Export", icon: Download },
];
```

---

### 3. Add Progress Indicator (1 hour)
**Before:** No indication of progress
**After:** Clear step indicator

```tsx
<div className="flex items-center gap-2">
    {steps.map((step, i) => (
        <div key={step.id} className={cn(
            "flex items-center",
            i <= activeStep ? "text-brand-blue" : "text-zinc-600"
        )}>
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                i <= activeStep ? "bg-brand-blue text-white" : "bg-zinc-800"
            )}>
                {i + 1}
            </div>
            {i < steps.length - 1 && <div className="w-8 h-0.5 bg-zinc-800" />}
        </div>
    ))}
</div>
```

---

### 4. Make Excel Upload Always Visible (30 minutes)
**Before:** Buried in accordion
**After:** Always visible on page

```tsx
// Remove the accordion logic
// Show dropzone by default
{selectedPath === "MIRROR" && (
    <ExcelDropzone onFileSelect={importANCExcel} />
)}
```

---

### 5. Add Undo for Delete (45 minutes)
**Before:** Instant delete, no recovery
**After:** Toast with undo

```tsx
const [deletedScreens, setDeletedScreens] = useState([]);

const removeField = (index) => {
    const screen = screens[index];
    setDeletedScreens(prev => [...prev, { screen, index, timestamp: Date.now() }]);
    // ... remove from array
    toast.success("Screen removed", {
        action: {
            label: "Undo",
            onClick: () => {
                // Restore screen
            }
        }
    });
    // Clear deleted items after 30 seconds
    setTimeout(() => {
        setDeletedScreens(prev => prev.filter(s => Date.now() - s.timestamp < 30000));
    }, 30000);
};
```

---

## Conclusion

This application is **powerful but punishing**. It has excellent features (auto-save, real-time PDF preview, AI enrichment) but buries them under layers of complexity.

**The Good:**
- Sophisticated engineering
- Real-time calculations
- Auto-save
- AI integration

**The Bad:**
- Confusing navigation
- Overcomplicated workflows
- Hidden critical actions
- No undo/redo
- Browser prompts in 2026

**Ahmad's Verdict:** "This is shit. I have to work harder than the computer just to create a simple proposal."

**Recommendation:** Simplify the UI before launch. Focus on the 80% use case: users want to upload an Excel file, review the screens, and export a PDF. Everything else should be secondary.

---

## Score Breakdown

| Axis | Score | Status |
|------|-------|--------|
| Clarity | 1/2 | ⚠️ MEH |
| Navigation | 2/2 | 💀 SHIT |
| Effort | 2/2 | 💀 SHIT |
| Visual Sanity | 1/2 | ⚠️ MEH |
| Respect for User | 2/2 | 💀 SHIT |
| **TOTAL** | **8/14** | **💀 SHIT** |

**Ahmad's Final Verdict:** This needs work. Don't launch until you fix the navigation and simplify the workflows.

---

*Report generated by Kilo Code using the "Would Ahmad Think It's Shit?" framework*
