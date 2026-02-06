/**
 * Flawless page break for PDF: drop this in the flow and the next content starts on a new page.
 * Use directly as a sibling in your layout (like docx's PageBreak in a Paragraph's children).
 * Do NOT wrap in a TextRun or other inline container.
 */
export default function PageBreak() {
  return (
    <div
      className="pdf-page-break"
      aria-hidden="true"
      style={{
        breakBefore: "page",
        pageBreakBefore: "always",
        height: 0,
        margin: 0,
        padding: 0,
        overflow: "hidden",
        border: "none",
        clear: "both",
      }}
    />
  );
}
