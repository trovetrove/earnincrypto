export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/manage-panel/"] }],
    sitemap: "https://earnincrypto.io/sitemap.xml",
    host: "https://earnincrypto.io",
  };
}
