/**
 * components/rich-content.tsx
 * Renders HTML stored in the database.
 * Server-side strips inline styles — safety net for old content.
 *
 * Authoring happens in the sidehustletools admin, which normalises content to
 * a fixed tag set (lib/editor/htmlNormalize.ts over there) — this side only
 * renders. Tables get a scroll wrapper so a wide one stays inside the column.
 */

interface RichContentProps {
  html: string;
  className?: string;
}

function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripInlineStyles(html: string): string {
  return (
    html
      .replace(/\s+style="[^"]*"/gi, "")
      .replace(/\s+style='[^']*'/gi, "")
      .replace(/\s+color="[^"]*"/gi, "")
      .replace(/\s+bgcolor="[^"]*"/gi, "")
      .replace(/\s+face="[^"]*"/gi, "")
      .replace(/\s+size="[^"]*"/gi, "")
      // Classes are stripped too, except the one the entity auto-linker puts on
      // its own anchors — without the exception every in-prose entity link
      // would lose its styling on the way through here.
      .replace(/\s+class="(?!entity-link")[^"]*"/gi, "")
      .replace(/\s+class='(?!entity-link')[^']*'/gi, "")
  );
}

/**
 * Added after the class-stripping pass above, which would otherwise remove
 * the wrapper's own class. Stays balanced even for nested tables.
 */
function wrapTables(html: string): string {
  return html
    .replace(/<table(\s[^>]*)?>/gi, '<div class="rich-table-scroll"><table$1>')
    .replace(/<\/table>/gi, "</table></div>");
}

/**
 * Stored content in, renderable HTML out — minus the table wrappers, which are
 * added last.
 *
 * Exported because the blog page needs the prepared article *before* it splits
 * it into sections: in-prose entity links have to be applied once across the
 * whole piece, otherwise each section would re-link the same project and a
 * three-section article would carry three identical links.
 *
 * Plain-text articles are converted to paragraphs here rather than in the
 * component, so the linker sees one uniform HTML shape either way.
 */
export function prepareArticleHtml(html: string): string {
  if (!html) return "";
  if (!isHtml(html)) {
    return html
      .split("\n\n")
      .filter(Boolean)
      .map((para) => `<p>${escapeHtml(para)}</p>`)
      .join("");
  }
  return stripInlineStyles(html);
}

export function RichContent({ html, className = "" }: RichContentProps) {
  if (!html) return null;

  const clean = wrapTables(prepareArticleHtml(html));

  return (
    <div
      className={`rich-prose ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
