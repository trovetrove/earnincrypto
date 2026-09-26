/**
 * components/rich-content.tsx
 * Renders HTML stored in the database.
 * Server-side strips inline styles — safety net for old content.
 *
 * Authoring happens in the sidehustletools admin, which normalises content to
 * a fixed tag set (lib/editor/htmlNormalize.ts over there) — this side only
 * renders. Tables get a scroll wrapper so a wide one stays inside the column,
 * and every link is rebuilt from an attribute allowlist (normaliseLinks).
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

/** rel tokens an author may set deliberately — affiliate links must keep "sponsored". */
const AUTHOR_REL_TOKENS = new Set(["sponsored", "nofollow", "ugc"]);

const SITE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://earnincrypto.io").hostname;
  } catch {
    return "earnincrypto.io";
  }
})();

function isOwnHost(href: string): boolean {
  try {
    const host = new URL(href).hostname;
    return host === SITE_HOST || host === `www.${SITE_HOST}` || `www.${host}` === SITE_HOST;
  } catch {
    return false;
  }
}

function readAttr(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i").exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
}

function escapeAttr(s: string): string {
  return s.replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Rebuilds every <a> from an attribute allowlist.
 *
 * Mirrors the sidehustletools sanitiser's link rules (this app has no
 * sanitize-html; the regex pipeline here is the whole cleaning step):
 *
 *   * External and new-tab links get noopener/noreferrer. Internal links
 *     don't — noreferrer on a same-site link only blinds analytics.
 *   * An author's sponsored/nofollow/ugc tokens survive, so a hand-written
 *     affiliate link keeps rel="sponsored".
 *   * Attributes are omitted, never emitted empty, and script-bearing hrefs
 *     (javascript:, data:, vbscript:) are dropped along with event handlers.
 *
 * Idempotent: the blog page runs this once over the whole article and again
 * per section, and the entity linker's own anchors pass through unchanged.
 */
function normaliseLinks(html: string): string {
  return html.replace(/<a\b[^>]*>/gi, (tag) => {
    const href = readAttr(tag, "href")?.trim();
    const target = readAttr(tag, "target")?.trim();
    const title = readAttr(tag, "title");
    const cls = readAttr(tag, "class");

    const attrs: string[] = [];
    const safeHref = href && !/^\s*(javascript|data|vbscript):/i.test(href) ? href : undefined;
    if (safeHref) attrs.push(`href="${escapeAttr(safeHref)}"`);
    if (target) attrs.push(`target="${escapeAttr(target)}"`);
    if (title) attrs.push(`title="${escapeAttr(title)}"`);
    if (cls === "entity-link") attrs.push(`class="entity-link"`);

    const rel = new Set(
      (readAttr(tag, "rel") ?? "")
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => AUTHOR_REL_TOKENS.has(t))
    );
    const isExternal = /^https?:\/\//i.test(safeHref ?? "") && !isOwnHost(safeHref ?? "");
    if (isExternal || target === "_blank") {
      rel.add("noopener");
      rel.add("noreferrer");
    }
    if (rel.size) attrs.push(`rel="${[...rel].join(" ")}"`);

    return attrs.length ? `<a ${attrs.join(" ")}>` : "<a>";
  });
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
  // The page template owns the only <h1>; a heading pasted in as h1 becomes a
  // section heading instead of a second page title.
  return normaliseLinks(stripInlineStyles(html)).replace(/<(\/?)h1\b/gi, "<$1h2");
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
