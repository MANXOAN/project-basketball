import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Activity, Loader2, ChevronRight, Star, Shield, Zap } from "lucide-react";
import banner2 from "../assets/banner2.jpg";
import { fetchFields, Field, formatCurrency } from "../lib/api";

export default function Home() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [sportType, setSportType] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchFields()
      .then((data) => setFields(data.slice(0, 6)))
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/fields${keyword ? `?q=${encodeURIComponent(keyword)}` : ""}`);
  };

  return (
    <div className="bg-black min-h-screen text-gray-300">
      {/* ── Hero ── */}
      <section
        className="relative w-full min-h-[600px] flex items-center"
        style={{
          backgroundImage: `url(${banner2})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 w-full">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-md px-4 py-2 rounded-full mb-8 animate-fade-in">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse-glow" />
              <span className="text-yellow-400 text-xs font-bold tracking-widest uppercase">
                {fields.length || "..."} cơ sở đang hoạt động
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 animate-fade-in-up tracking-tight">
              Đẳng Cấp Thể Thao<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                Trong Tầm Tay Bạn
              </span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl leading-relaxed mb-10 animate-fade-in-up delay-100 max-w-2xl">
              Nền tảng đặt sân bóng rổ và thể thao cao cấp. Trải nghiệm dịch vụ 
              hàng đầu với mạng lưới hơn <strong className="text-yellow-500">2,400 cơ sở</strong> trên toàn quốc.
            </p>

            <div className="flex flex-wrap gap-4 animate-fade-in-up delay-200">
              <Link
                to="/fields"
                className="btn-primary px-8 py-4 rounded-xl text-base flex items-center gap-2"
              >
                <Search className="w-5 h-5" /> Đặt sân ngay
              </Link>
              <Link
                to="/map"
                className="btn-outline px-8 py-4 rounded-xl text-base flex items-center gap-2 backdrop-blur-sm"
              >
                🗺️ Xem bản đồ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Search bar ── */}
      <section className="relative z-20 -mt-24 mb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl shadow-yellow-500/5 border border-white/10 p-6 md:p-8 backdrop-blur-xl">
            <h2 className="text-sm font-extrabold text-white mb-6 flex items-center gap-2 uppercase tracking-wider">
              <Search className="w-4 h-4 text-yellow-500" />
              Tìm kiếm nhanh
            </h2>
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Khu vực / Tên sân
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Nhập địa điểm..."
                  className="w-full bg-black border border-white/10 focus:border-yellow-500 text-white text-sm rounded-xl px-4 py-3.5 outline-none transition-all placeholder:text-gray-600"
                />
              </div>
              <div className="md:col-span-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" /> Bộ môn
                </label>
                <select
                  value={sportType}
                  onChange={(e) => setSportType(e.target.value)}
                  className="w-full bg-black border border-white/10 focus:border-yellow-500 text-white text-sm rounded-xl px-4 py-3.5 outline-none transition-all appearance-none"
                >
                  <option value="">Tất cả môn</option>
                  <option>Bóng rổ</option>
                  <option>Bóng đá 5x5</option>
                  <option>Bóng đá 7x7</option>
                  <option>Cầu lông</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <button
                  type="submit"
                  className="btn-primary w-full rounded-xl px-5 py-3.5 flex justify-center items-center gap-2 text-sm"
                >
                  <Search className="w-4 h-4" /> Tìm ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ── Why choose us ── */}
      <section className="py-16 bg-black border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              Tại sao chọn <span className="text-yellow-500">GoldenState</span>?
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Nền tảng đặt sân thể thao chuyên nghiệp với dịch vụ hậu mãi tốt nhất.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: <Zap className="w-8 h-8 text-yellow-500" />,
                title: "Nhanh chóng & Tiện lợi",
                desc: "Hệ thống booking thời gian thực. Giữ chỗ ngay lập tức trong vòng 60 giây.",
              },
              {
                icon: <Shield className="w-8 h-8 text-yellow-500" />,
                title: "Thanh toán an toàn",
                desc: "Hỗ trợ đa dạng phương thức. Đảm bảo hoàn tiền 100% nếu hủy trước 2 giờ.",
              },
              {
                icon: <Star className="w-8 h-8 text-yellow-500" />,
                title: "Chất lượng chuẩn",
                desc: "Tất cả hệ thống sân đều được kiểm định chất lượng định kỳ và đánh giá minh bạch.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 rounded-2xl p-8 transition-colors group animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="p-4 bg-black rounded-xl inline-flex mb-6 border border-white/10 group-hover:border-yellow-500/50 transition-colors">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured fields ── */}
      <section className="py-24 bg-[var(--color-primary)]">
        <div className="max-w-7xl mx-auto px-4">
          {/* Section header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-yellow-500 text-xs font-bold uppercase tracking-widest mb-3">
                <span className="w-8 h-px bg-yellow-500"></span> Nổi bật tuần này
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                Sân Bãi Hàng Đầu
              </h2>
            </div>
            <Link
              to="/fields"
              className="inline-flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-yellow-400 transition-colors group"
            >
              Xem tất cả danh sách 
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-500 text-sm font-medium">Đang tải dữ liệu sân...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {fields.map((field) => (
                <Link
                  key={field.id}
                  to={`/field/${field.id}`}
                  className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden group field-card flex flex-col h-full hover:border-yellow-500/30 transition-colors"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={field.imageUrl || field.image}
                      alt={field.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-80" />
                    
                    {/* Tags */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="bg-black/60 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/10">
                        {field.type || field.sportLabel}
                      </span>
                    </div>
                    {/* Rating */}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-white text-xs font-bold">{Number(field.rating ?? 4.8).toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-yellow-400 transition-colors">
                        {field.name}
                      </h3>
                      <p className="text-gray-400 text-sm flex items-center gap-1.5 mb-4 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> {field.location || field.address}
                      </p>
                    </div>

                    <div className="pt-5 border-t border-white/10 flex items-center justify-between mt-auto">
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Giá từ</p>
                        <p className="text-yellow-400 font-bold text-lg">
                          {formatCurrency(field.pricePerHour ?? field.priceFrom)}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-black transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 relative overflow-hidden bg-zinc-900 border-t border-white/5">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Sẵn sàng ra sân?
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
            Gia nhập cộng đồng 150,000+ người chơi. Đặt sân, tìm đối, và tận hưởng niềm đam mê thể thao ngay hôm nay.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register" className="btn-primary px-8 py-4 rounded-xl text-base">
              Đăng ký ngay - Miễn phí
            </Link>
            <Link to="/fields" className="btn-outline px-8 py-4 rounded-xl text-base bg-black/50">
              Khám phá sân bãi
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
