/**
 * components/rich-content.tsx
 * Renders HTML stored in the database.
 * Server-side strips inline styles — safety net for old content.
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

  const clean = stripInlineStyles(html);

  return (
    <div
      className={`rich-prose ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
