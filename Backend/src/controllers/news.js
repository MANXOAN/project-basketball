const RSS_URL = process.env.BASKETBALL_NEWS_RSS_URL || "https://vnexpress.net/rss/the-thao.rss";
const CACHE_MS = 10 * 60 * 1000;
let cache = { expiresAt: 0, items: [] };

const TOPIC_RULES = [
  { category: "Bóng rổ", terms: ["bóng rổ", "basketball", "nba", "vba", "3x3", "5x5", "dunk", "fiba"] },
];

const fallbackNews = [
  ["Lịch thi đấu bóng rổ hôm nay: những trận đáng chú ý", "Tin bóng rổ", "Cập nhật lịch thi đấu, kết quả và các điểm nhấn bóng rổ đáng theo dõi trong ngày."],
  ["Khởi động đúng trước một trận bóng rổ", "Kỹ năng", "Quy trình khởi động giúp cổ chân, đầu gối và vai sẵn sàng trước khi vào sân."],
  ["Bí quyết chọn sân bóng rổ phù hợp cho đội", "Cẩm nang", "Mặt sân, vành rổ, ánh sáng và kích thước 3x3 hoặc 5x5 là những yếu tố cần cân nhắc."],
  ["Dinh dưỡng phục hồi sau buổi tập bóng rổ", "Thể lực bóng rổ", "Gợi ý bữa ăn và cách bù nước hợp lý sau một buổi tập cường độ cao."],
  ["Xây dựng đội bóng rổ phong trào gắn kết", "Cộng đồng", "Các thói quen giúp đội duy trì lịch tập, phân vai và phối hợp tốt hơn trên sân."],
  ["Kinh nghiệm tổ chức giải bóng rổ nội bộ", "Giải đấu", "Từ thể thức thi đấu đến phân công trọng tài: các bước để giải 3x3 hoặc 5x5 diễn ra trơn tru."],
  ["Những lỗi phổ biến khi đặt sân bóng rổ giờ cao điểm", "Cẩm nang", "Chủ động chọn giờ, kiểm tra loại sân và xác nhận thông tin trước khi thanh toán."],
  ["Theo dõi hiệu suất bóng rổ bằng các chỉ số đơn giản", "Kỹ năng", "Ghi lại thời lượng tập, tỷ lệ ném và số lần kiến tạo để cải thiện đều đặn."],
];

function decode(value = "") {
  return value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

function text(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decode(match?.[1] || "");
}

function imageFromDescription(description) {
  return description.match(/<img[^>]+src=["']([^"']+)/i)?.[1] || "";
}

function topicFor(title, description) {
  const value = `${title} ${description}`.toLocaleLowerCase("vi-VN");
  return TOPIC_RULES.find((rule) => rule.terms.some((term) => value.includes(term)))?.category;
}

function parseRss(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match, index) => {
    const item = match[1];
    const description = text(item, "description");
    const title = text(item, "title");
    const category = topicFor(title, description);
    return {
      id: `rss-${index + 1}`,
      title,
      category,
      desc: description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      date: text(item, "pubDate"),
      image: imageFromDescription(description),
      sourceUrl: text(item, "link"),
      source: "VnExpress",
    };
  }).filter((item) => item.title && item.sourceUrl && item.category).slice(0, 18);
}

function demoItems() {
  return fallbackNews.map(([title, category, desc], index) => ({
    id: `demo-${index + 1}`,
    title,
    category,
    desc,
    date: new Date(Date.now() - index * 86400000).toLocaleDateString("vi-VN"),
    image: "",
    source: "GoldenState",
  }));
}

export async function getNews(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 18, 1), 30);
  if (cache.expiresAt > Date.now()) return res.json({ items: cache.items.slice(0, limit), source: "cache" });
  try {
    const response = await fetch(RSS_URL, { headers: { "User-Agent": "GoldenStateBasketball/1.0 (+basketball news aggregator)" }, signal: AbortSignal.timeout(7000) });
    if (!response.ok) throw new Error(`RSS returned ${response.status}`);
    const items = parseRss(await response.text());
    if (!items.length) throw new Error("RSS has no items");
    cache = { items, expiresAt: Date.now() + CACHE_MS };
    return res.json({ items: items.slice(0, limit), source: "rss" });
  } catch {
    const items = demoItems();
    return res.json({ items: items.slice(0, limit), source: "demo" });
  }
}
