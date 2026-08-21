// lib/supabase/types.ts

export type FaqItem = {
  question: string;
  answer: string;
};

export type ComparisonStub = {
  vsSlug: string;
  vsTitle: string;
};

export type EntryRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  short_description: string;
  description: string;
  url: string;
  referral_url: string | null;
  logo_url: string | null;
  price_tier: "free" | "freemium" | "paid" | "credits";
  rating: number;
  potential: string | null;
  effort_level: "low" | "medium" | "high";
  audience: string[] | null;
  tags: string[] | null;
  pros: string[] | null;
  cons: string[] | null;
  how_to_use: string[] | null;
  alternatives: string[] | null;
  free_tier_details: string | null;
  realistic_value: string | null;
  is_mobile_friendly: boolean;
  is_passive: boolean;
  is_featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  best_for: string | null;
  json_ld_type: "SoftwareApplication" | "Product" | "Service" | "FinancialProduct";
  faq_items: FaqItem[] | null;
  comparisons: ComparisonStub[] | null;
  created_at: string;
  updated_at: string;
};

export type CryptoEntryRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  short_description: string;
  description: string;
  url: string;
  referral_url: string | null;
  logo_url: string | null;
  price_tier: "free" | "freemium" | "paid" | "token-required";
  rating: number;
  potential: string | null;
  effort_level: "low" | "medium" | "high";
  chain: string | null;
  token: string | null;
  risk_level: "low" | "medium" | "high";
  audience: string[] | null;
  tags: string[] | null;
  pros: string[] | null;
  cons: string[] | null;
  how_to_use: string[] | null;
  alternatives: string[] | null;
  free_tier_details: string | null;
  realistic_value: string | null;
  is_mobile_friendly: boolean;
  is_featured: boolean;
  is_verified: boolean;
  meta_title: string | null;
  meta_description: string | null;
  best_for: string | null;
  faq_items: FaqItem[] | null;
  created_at: string;
  updated_at: string;
};

export type PostStatus = "draft" | "published";

export type AdPlacement =
  | "blog-top"
  | "blog-middle"
  | "blog-bottom"
  | "sidebar"
  | "category"
  | "listing";

export type OpportunityStatus = {
  label: string;
  token: string;
  airdrop: string;
  lastChecked: string;
};

export type CryptoBlogPostRow = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  content: string | null;
  cover_image_url: string | null;
  category: string;
  tags: string[] | null;
  chain: string | null;
  target_keyword: string | null;
  secondary_keywords: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  related_entry_slugs: string[] | null;
  related_post_slugs: string[] | null;
  status: PostStatus;
  is_featured: boolean;
  author_name: string | null;
  faq_items: FaqItem[] | null;
  opportunity_status: OpportunityStatus | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CryptoAdRow = {
  id: string;
  advertiser: string;
  title: string;
  description: string | null;
  image_url: string | null;
  destination_url: string;
  category: string | null;
  placement: AdPlacement;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  priority: number;
  sponsored_label: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      crypto_blog_posts: {
        Row: CryptoBlogPostRow;
        Insert: Omit<CryptoBlogPostRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CryptoBlogPostRow, "id">>;
        Relationships: any[];
      };
      crypto_ads: {
        Row: CryptoAdRow;
        Insert: Omit<CryptoAdRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CryptoAdRow, "id">>;
        Relationships: any[];
      };
      entries: {
        Row: EntryRow;
        Insert: Omit<EntryRow, "id" | "created_at" | "updated_at" | "logo_url"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          logo_url?: string | null;
        };
        Update: Partial<Omit<EntryRow, "id">>;
        Relationships: any[];
      };
      crypto_entries: {
        Row: CryptoEntryRow;
        Insert: Omit<CryptoEntryRow, "id" | "created_at" | "updated_at" | "logo_url"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          logo_url?: string | null;
        };
        Update: Partial<Omit<CryptoEntryRow, "id">>;
        Relationships: any[];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          user_email: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          payload: Record<string, unknown> | null;
          success: boolean;
          error_message: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id">>;
        Relationships: any[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      price_tier: "free" | "freemium" | "paid" | "credits";
      crypto_price_tier: "free" | "freemium" | "paid" | "token-required";
      effort_level: "low" | "medium" | "high";
      risk_level: "low" | "medium" | "high";
      json_ld_type: "SoftwareApplication" | "Product" | "Service" | "FinancialProduct";
      post_status: PostStatus;
      ad_placement: AdPlacement;
    };
  };
};
