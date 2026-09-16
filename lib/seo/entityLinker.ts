// lib/seo/entityLinker.ts
//
// Turns the first mention of a directory listing inside an article's prose into
// a contextual link to that listing.
//
// Card blocks below an article are easy to ignore; a link on the platform's
// name in the sentence where the reader is already thinking about it is not.
// That's the difference between a "related tools" widget and an internal link
// graph Google reads as an endorsement.
//
// Rules, in order of how much trouble ignoring them causes:
//
//   1. Never rewrite inside markup. The scanner walks the HTML and only ever
//      substitutes within text nodes.
//   2. Never link inside an existing <a>, a heading, <code>/<pre>, or a table
//      header — nested anchors are invalid HTML and headings are navigational.
//   3. One link per entity per article, capped overall. Linking every mention
//      of "Freecash" eleven times is the over-optimisation the growth plan
//      explicitly warns against.
//   4. Match on word boundaries, longest name first, and keep the author's own
//      casing in the output.
//
// This runs on already-sanitised HTML (see components/rich-content.tsx), so the
// anchors it inserts are its own and are not re-parsed by the sanitiser.

export type LinkableEntity = {
  /** Canonical display name, e.g. "Honeygain". */
  name: string;
  /** Alternate spellings, e.g. ["Pawns.app", "Pawns app"]. */
  aliases: string[];
  /** Destination path, e.g. "/earn-money/honeygain-review". */
  href: string;
};

/** Tags whose contents must never be rewritten. */
const SKIP_TAGS = new Set(["a", "h1", "h2", "h3", "h4", "h5", "h6", "code", "pre", "th"]);

const DEFAULT_MAX_LINKS = 8;

/**
 * Names shorter than this are skipped entirely. "AI", "Wise" and similar
 * two-to-four letter brand names collide with ordinary English constantly, and
 * a false positive here rewrites the author's sentence.
 */
const MIN_NAME_LENGTH = 5;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Candidate = { name: string; href: string; re: RegExp };

function buildCandidates(entities: LinkableEntity[]): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();

  for (const entity of entities) {
    for (const raw of [entity.name, ...entity.aliases]) {
      const name = raw.trim();
      if (name.length < MIN_NAME_LENGTH) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        name,
        href: entity.href,
        // \b is unreliable next to "." and "+" (Pawns.app), so the boundaries
        // are spelled out: not preceded/followed by a word character or hyphen.
        re: new RegExp(`(^|[^\\w-])(${escapeRegExp(name)})(?![\\w-])`, "i"),
      });
    }
  }

  // Longest first so "Prime Opinion" wins over a hypothetical "Prime".
  return out.sort((a, b) => b.name.length - a.name.length);
}

/**
 * Replaces at most one occurrence per remaining candidate in a single text run.
 * Returns the rewritten text and the hrefs consumed.
 */
function linkTextRun(
  text: string,
  candidates: Candidate[],
  used: Set<string>,
  budget: { left: number }
): string {
  let result = text;

  for (const candidate of candidates) {
    if (budget.left <= 0) break;
    if (used.has(candidate.href)) continue;

    const match = candidate.re.exec(result);
    if (!match) continue;

    const [, prefix, matched] = match;
    const start = match.index + prefix.length;
    const anchor =
      `<a href="${escapeHtml(candidate.href)}" class="entity-link">` +
      `${escapeHtml(matched)}</a>`;

    result = result.slice(0, start) + anchor + result.slice(start + matched.length);

    used.add(candidate.href);
    budget.left -= 1;
  }

  return result;
}

/**
 * Walks `html` and links entity mentions in its text nodes.
 *
 * The scanner is a small hand-rolled tag splitter rather than a parser: the
 * input is already sanitised to a known tag allowlist, so there is no malformed
 * markup to recover from, and this avoids pulling a DOM implementation into
 * every article render.
 */
export function linkEntities(
  html: string,
  entities: LinkableEntity[],
  options: { maxLinks?: number } = {}
): string {
  if (!html || !entities.length) return html;

  const candidates = buildCandidates(entities);
  if (!candidates.length) return html;

  const budget = { left: options.maxLinks ?? DEFAULT_MAX_LINKS };
  const used = new Set<string>();

  let out = "";
  let cursor = 0;
  // Nesting depth inside any skip tag. A count, not a boolean: <a> inside a
  // heading must not re-enable linking when the </a> closes.
  let skipDepth = 0;

  while (cursor < html.length) {
    const lt = html.indexOf("<", cursor);

    if (lt === -1) {
      const tail = html.slice(cursor);
      out += skipDepth > 0 ? tail : linkTextRun(tail, candidates, used, budget);
      break;
    }

    const text = html.slice(cursor, lt);
    if (text) {
      out += skipDepth > 0 ? text : linkTextRun(text, candidates, used, budget);
    }

    const gt = html.indexOf(">", lt);
    if (gt === -1) {
      // Unterminated tag — emit the remainder untouched rather than guessing.
      out += html.slice(lt);
      break;
    }

    const tag = html.slice(lt, gt + 1);
    out += tag;
    cursor = gt + 1;

    const nameMatch = /^<\s*(\/?)\s*([a-z0-9]+)/i.exec(tag);
    if (!nameMatch) continue;

    const isClosing = nameMatch[1] === "/";
    const tagName = nameMatch[2].toLowerCase();
    const selfClosing = /\/\s*>$/.test(tag);

    if (!SKIP_TAGS.has(tagName) || selfClosing) continue;

    if (isClosing) skipDepth = Math.max(0, skipDepth - 1);
    else skipDepth += 1;
  }

  return out;
}

/**
 * Chooses which listings are worth auto-linking in a given article.
 *
 * Only entities the article *already mentions* are eligible — this adds links
 * to existing prose, it never inserts a platform the author didn't write about.
 * Ordered by money-page value so that when the cap binds, the links that
 * survive are the ones pointing somewhere that converts.
 */
export function selectLinkableEntities(
  plainText: string,
  entries: {
    slug: string;
    title: string;
    category: string;
    aliases: string[];
    revenuePriority: number;
  }[],
  limit = DEFAULT_MAX_LINKS
): LinkableEntity[] {
  const haystack = plainText.toLowerCase();

  return entries
    .filter((e) =>
      [e.title, ...e.aliases].some(
        (n) => n.trim().length >= MIN_NAME_LENGTH && haystack.includes(n.toLowerCase().trim())
      )
    )
    .sort((a, b) => b.revenuePriority - a.revenuePriority)
    .slice(0, limit)
    .map((e) => ({
      name: e.title,
      aliases: e.aliases,
      href: `/${e.category}/${e.slug}`,
    }));
}
