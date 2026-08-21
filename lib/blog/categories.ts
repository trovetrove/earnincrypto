// lib/blog/categories.ts
//
// Article types used by the blog index filter. Mirrors the list the manage
// panel offers when authoring a post (sidehustletools-main/lib/blog/templates.ts)
// — keep the two in sync when adding a type.

export type BlogCategoryOption = { value: string; label: string };

export const cryptoBlogCategories: BlogCategoryOption[] = [
  { value: "airdrop", label: "Airdrop / Opportunity" },
  { value: "guide", label: "Guide / How-To" },
  { value: "review", label: "Review" },
  { value: "comparison", label: "Comparison" },
  { value: "best-of", label: "Best Of / Roundup" },
  { value: "security", label: "Security" },
  { value: "news", label: "News & Updates" },
];
