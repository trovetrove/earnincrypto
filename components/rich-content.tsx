/**
 * components/rich-content.tsx
 *
 * Renders HTML stored in the database.
 * Server-side strips inline color/background/font styles — safety net
 * for any content saved before the sanitizer was in place.
 */

interface RichContentProps {
  html: string;
  className?: string;
}

function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

/**
 * Server-side HTML sanitizer.
 * Strips style="...", color="...", bgcolor="...", face="..." attributes
 * using regex (no DOM available server-side).
 * Keeps all structural tags and href/target/rel on anchors.
 */
function stripInlineStyles(html: string): string {
  return html
    // Remove style="..." attributes entirely
    .replace(/\s+style="[^"]*"/gi, "")
    .replace(/\s+style='[^']*'/gi, "")
    // Remove legacy color/bgcolor/face/size attributes
    .replace(/\s+color="[^"]*"/gi, "")
    .replace(/\s+bgcolor="[^"]*"/gi, "")
    .replace(/\s+face="[^"]*"/gi, "")
    .replace(/\s+size="[^"]*"/gi, "")
    // Remove class attributes (they may reference admin-only styles)
    .replace(/\s+class="[^"]*"/gi, "")
    .replace(/\s+class='[^']*'/gi, "");
}

export function RichContent({ html, className = "" }: RichContentProps) {
  if (!html) return null;

  // Plain text fallback — split by double newline into paragraphs
  if (!isHtml(html)) {
    return (
      <div className={`rich-prose ${className}`}>
        {html.split("\n\n").filter(Boolean).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    );
  }

  // Strip any inline styles that may have been saved before the sanitizer
  const clean = stripInlineStyles(html);

  return (
    <div
      className={`rich-prose ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
