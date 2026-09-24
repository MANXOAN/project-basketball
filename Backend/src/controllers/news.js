const VBA_NEWS_API_URL = process.env.VBA_NEWS_API_URL || "https://gw.vba.vn/api/vba/blogs";
const CACHE_MS = 10 * 60 * 1000;
let cache = { expiresAt: 0, items: [] };

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("vi-VN");
}

function normalizeVbaBlog(blog) {
  const category = blog.categories?.find((item) => item?.title && item.title !== "Zalo")?.title
    || blog.categories?.find((item) => item?.title)?.title
    || "Tin VBA";

  return {
    id: `vba-${blog.id}`,
    title: cleanText(blog.title),
    category: cleanText(category),
    desc: cleanText(blog.summary || blog.meta_description || blog.content).slice(0, 280),
    date: formatDate(blog.published_from || blog.published_at || blog.created_at),
    image: String(blog.image_url || "").trim(),
    sourceUrl: blog.slug ? `https://vba.vn/news/${encodeURIComponent(blog.slug)}` : "https://vba.vn/news",
    source: "VBA",
  };
}

export async function getNews(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 18, 1), 30);
  if (cache.expiresAt > Date.now()) {
    return res.json({ items: cache.items.slice(0, limit), source: "vba", cached: true });
  }

  try {
    const url = new URL(VBA_NEWS_API_URL);
    url.searchParams.set("page", "1");
    url.searchParams.set("limit", String(limit));
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "GoldenStateBasketball/1.0" },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error(`VBA API returned ${response.status}`);

    const payload = await response.json();
    const items = (payload?.data?.blogs || []).map(normalizeVbaBlog).filter((item) => item.title);
    if (!items.length) throw new Error("VBA API has no news items");

    cache = { items, expiresAt: Date.now() + CACHE_MS };
    return res.json({ items, source: "vba", cached: false });
  } catch (error) {
    console.error("Unable to load VBA news:", error.message);
    return res.status(502).json({ items: [], source: "vba", message: "Không thể tải tin tức từ VBA lúc này." });
  }
}
