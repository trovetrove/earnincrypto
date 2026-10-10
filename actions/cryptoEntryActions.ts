"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { TAG_CONTENT } from "@/lib/cache/content";
import { clusterSetFor, resolveCluster } from "@/lib/seo/clusters";
import { comparisonPath, hubPath } from "@/lib/seo/contentGraph";
import { isSlugLike } from "@/lib/seo/paths";

const cryptoEntrySchema = z.object({
  title: z.string().min(2, "Title is required"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers and hyphens only"),
  category: z.string().min(1, "Category is required"),
  shortDescription: z.string().min(10, "Short description is required").max(300),
  description: z.string().min(50, "Description must be at least 50 characters"),
  url: z.string().url("Must be a valid URL"),
  referralUrl: z.string().url().optional().or(z.literal("")),
  priceTier: z.enum(["free", "freemium", "paid", "token-required"]),
  rating: z.coerce.number().min(1).max(5),
  potential: z.string().optional(),
  effortLevel: z.enum(["low", "medium", "high"]),
  chain: z.string().optional().or(z.literal("")),
  token: z.string().optional().or(z.literal("")),
  riskLevel: z.enum(["low", "medium", "high"]),
  tags: z.string().optional(),
  audience: z.string().optional(),
  freeTierDetails: z.string().optional(),
  realisticValue: z.string().optional(),
  pros: z.string().optional(),
  cons: z.string().optional(),
  howToUse: z.string().optional(),
  alternatives: z.string().optional(),
  isMobileFriendly: z.string().optional(),
  isFeatured: z.string().optional(),
  isVerified: z.string().optional(),
  metaTitle: z.string().max(70).optional().or(z.literal("")),
  metaDescription: z.string().max(160).optional().or(z.literal("")),
  bestFor: z.string().optional().or(z.literal("")),
  faqItems: z.string().optional(),
});

export type CryptoActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

function safeParseJsonArray(raw: string | undefined | null): unknown[] {
  if (!raw || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseCryptoFormData(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = cryptoEntrySchema.safeParse(raw);

  if (!parsed.success) {
    return { data: null, errors: parsed.error.flatten().fieldErrors };
  }

  const d = parsed.data;
  const faqItems = safeParseJsonArray(d.faqItems);

  return {
    data: {
      title: d.title,
      slug: d.slug,
      category: d.category,
      short_description: d.shortDescription,
      description: d.description,
      url: d.url,
      referral_url: d.referralUrl || null,
      logo_url: null,
      price_tier: d.priceTier,
      rating: d.rating,
      potential: d.potential || "",
      effort_level: d.effortLevel,
      chain: d.chain || null,
      token: d.token || null,
      risk_level: d.riskLevel,
      tags: d.tags ? d.tags.split(",").map(s => s.trim()).filter(Boolean) : [],
      audience: d.audience ? d.audience.split(",").map(s => s.trim()).filter(Boolean) : [],
      free_tier_details: d.freeTierDetails || null,
      realistic_value: d.realisticValue || "",
      pros: d.pros ? d.pros.split("\n").map(s => s.trim()).filter(Boolean) : [],
      cons: d.cons ? d.cons.split("\n").map(s => s.trim()).filter(Boolean) : [],
      how_to_use: d.howToUse ? d.howToUse.split("\n").map(s => s.trim()).filter(Boolean) : [],
      alternatives: d.alternatives ? d.alternatives.split(",").map(s => s.trim()).filter(Boolean) : [],
      is_mobile_friendly: d.isMobileFriendly === "true",
      is_featured: d.isFeatured === "true",
      is_verified: d.isVerified === "true",
      meta_title: d.metaTitle || null,
      meta_description: d.metaDescription || null,
      best_for: d.bestFor || null,
      faq_items: faqItems,
    },
    errors: null,
  };
}

/** The columns revalidateCryptoPages needs to name a listing's own pages. */
type ListingRef = {
  category: string;
  slug: string;
  title?: string | null;
  tags?: string[] | null;
  cluster?: string | null;
  alternatives?: string[] | null;
};

const LISTING_REF_COLUMNS = "category, slug, title, tags, cluster, alternatives";

/**
 * Purge what an edit to one listing changes, and nothing wider.
 *
 * The tag purge drops the cached table reads, so the next render of any page
 * rebuilds from fresh rows. It does not mark pages stale: only the pages named
 * here are re-rendered, and every other page picks the change up (related
 * reading, similar listings, guides) when its own window expires. There are
 * deliberately no `[param]` patterns here — one of those marks every page
 * under the route stale at once, and crawlers then re-render them all.
 *
 * Pages named:
 *   * the listing, its category, and each comparison it declares;
 *   * its topic hub — the resolved cluster, since the form has no cluster
 *     field and the stored one is kept on update;
 *   * the index pages that list or link it, and the sitemap.
 *
 * Paths for pages that don't exist (an alternative that isn't a listing) are
 * a no-op, so the comparison list doesn't need to check them.
 */
function revalidateCryptoPages(ref: ListingRef) {
  revalidateTag(TAG_CONTENT);

  const set = clusterSetFor("crypto");
  const cluster = resolveCluster(
    ref.cluster,
    { slug: ref.slug, category: ref.category, tags: ref.tags ?? [], title: ref.title ?? undefined },
    set
  );

  const paths = new Set<string>([
    `/${ref.category}/${ref.slug}`,
    `/${ref.category}`,
    hubPath(cluster),
    "/",
    "/directory",
    "/compare",
    "/topics",
    "/sitemap.xml",
  ]);

  for (const alt of ref.alternatives ?? []) {
    const altSlug = alt.toLowerCase().trim().replace(/\s+/g, "-");
    if (isSlugLike(altSlug) && altSlug !== ref.slug) paths.add(comparisonPath(ref.slug, altSlug));
  }

  for (const path of paths) revalidatePath(path);
}

export async function createCryptoEntry(
  _prevState: CryptoActionState,
  formData: FormData
): Promise<CryptoActionState> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, message: "Unauthorized" };

    const { data, errors } = parseCryptoFormData(formData);
    if (errors || !data) return { success: false, message: "Validation failed", errors };

    const sb = getSupabaseServer();
    const { data: existing } = await sb
      .from("crypto_entries")
      .select("id")
      .eq("slug", data.slug)
      .single();

    if (existing) {
      return { success: false, message: "Validation failed", errors: { slug: ["This slug is already taken"] } };
    }

    const insertPayload = {
      ...data,
      updated_at: new Date().toISOString(),
    } as any;

    const { error } = await sb.from("crypto_entries").insert(insertPayload);

    if (error) {
      console.error("[createCryptoEntry]", error);
      return { success: false, message: `Database error: ${error.message}` };
    }

    revalidateCryptoPages(data);
    return { success: true, message: `"${data.title}" created successfully` };
  } catch (err) {
    console.error("[createCryptoEntry] unexpected:", err);
    return {
      success: false,
      message: err instanceof Error ? `Unexpected error: ${err.message}` : "An unexpected error occurred",
    };
  }
}

export async function updateCryptoEntry(
  id: string,
  _prevState: CryptoActionState,
  formData: FormData
): Promise<CryptoActionState> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, message: "Unauthorized" };

    const { data, errors } = parseCryptoFormData(formData);
    if (errors || !data) return { success: false, message: "Validation failed", errors };

    const sb = getSupabaseServer();
    const { data: oldEntry } = await sb
      .from("crypto_entries")
      .select(LISTING_REF_COLUMNS)
      .eq("id", id)
      .single();

    const updatePayload = {
      ...data,
      updated_at: new Date().toISOString(),
    } as any;

    const { error } = await sb.from("crypto_entries").update(updatePayload).eq("id", id);

    if (error) {
      console.error("[updateCryptoEntry]", error);
      return { success: false, message: `Database error: ${error.message}` };
    }

    // The form has no cluster field, so the stored one carries over.
    if (oldEntry) revalidateCryptoPages(oldEntry);
    revalidateCryptoPages({ ...data, cluster: oldEntry?.cluster });

    return { success: true, message: `"${data.title}" updated successfully` };
  } catch (err) {
    console.error("[updateCryptoEntry] unexpected:", err);
    return {
      success: false,
      message: err instanceof Error ? `Unexpected error: ${err.message}` : "An unexpected error occurred",
    };
  }
}

export async function deleteCryptoEntry(id: string): Promise<CryptoActionState> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, message: "Unauthorized" };

    const sb = getSupabaseServer();
    const { data: entry } = await sb
      .from("crypto_entries")
      .select(LISTING_REF_COLUMNS)
      .eq("id", id)
      .single();

    const { error } = await sb.from("crypto_entries").delete().eq("id", id);

    if (error) return { success: false, message: `Database error: ${error.message}` };

    if (entry) revalidateCryptoPages(entry);

    return { success: true, message: `"${entry?.title ?? "Entry"}" deleted` };
  } catch (err) {
    console.error("[deleteCryptoEntry] unexpected:", err);
    return {
      success: false,
      message: err instanceof Error ? `Unexpected error: ${err.message}` : "An unexpected error occurred",
    };
  }
}
