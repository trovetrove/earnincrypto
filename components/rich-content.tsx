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

function stripInlineStyles(html: string): string {
  return html
    .replace(/\s+style="[^"]*"/gi, "")
    .replace(/\s+style='[^']*'/gi, "")
    .replace(/\s+color="[^"]*"/gi, "")
    .replace(/\s+bgcolor="[^"]*"/gi, "")
    .replace(/\s+face="[^"]*"/gi, "")
    .replace(/\s+size="[^"]*"/gi, "")
    .replace(/\s+class="[^"]*"/gi, "")
    .replace(/\s+class='[^']*'/gi, "");
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

export function RichContent({ html, className = "" }: RichContentProps) {
  if (!html) return null;

  if (!isHtml(html)) {
    return (
      <div className={`rich-prose ${className}`}>
        {html.split("\n\n").filter(Boolean).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    );
  }

  const clean = wrapTables(stripInlineStyles(html));

  return (
    <div
      className={`rich-prose ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
