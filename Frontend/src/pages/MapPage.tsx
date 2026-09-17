import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MapPin, Navigation, ChevronRight, Star, Sparkles } from "lucide-react";
import { fetchFields, Field, formatCurrency } from "../lib/api";
import toast from "react-hot-toast";

declare global {
  interface Window {
    L: any;
  }
}

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Không tải được Leaflet"));
    document.body.appendChild(script);
  });
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    fetchFields()
      .then((data) => setFields(data))
      .catch(() => {
        toast.error("Không tải được danh sách sân");
        setFields([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !mapRef.current || fields.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled || !mapRef.current) return;

        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }

        const withCoords = fields.filter(
          (f) => typeof f.lat === "number" && typeof f.lng === "number"
        );
        if (withCoords.length === 0) {
          toast.error("Chưa có tọa độ lat/lng trong cơ sở dữ liệu");
          return;
        }

        const center: [number, number] = [
          withCoords[0].lat!,
          withCoords[0].lng!,
        ];
        const map = L.map(mapRef.current).setView(center, 12);
        mapInstance.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        }).addTo(map);

        const bounds: [number, number][] = [];

        withCoords.forEach((f) => {
          const marker = L.marker([f.lat!, f.lng!]).addTo(map);
          bounds.push([f.lat!, f.lng!]);
          marker.bindPopup(`
            <div style="min-width:200px;font-family:sans-serif;padding:4px">
              <strong style="font-size:14px;color:#111">${f.name}</strong><br/>
              <span style="color:#666;font-size:12px">${f.address}</span><br/>
              <div style="margin-top:6px;font-size:12px;font-weight:bold;color:#b45309">
                ${f.sportLabel || f.type} · từ ${formatCurrency(f.priceFrom || f.pricePerHour)}
              </div>
              <a href="/field/${f.id}" style="display:inline-block;margin-top:6px;color:#000;background:#F5C542;padding:4px 10px;border-radius:8px;font-weight:bold;font-size:11px;text-decoration:none">Xem chi tiết & Đặt sân →</a>
            </div>
          `);
          marker.on("click", () => setSelectedId(f.id));
        });

        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      } catch {
        toast.error("Lỗi khởi tạo bản đồ");
      }
    })();

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [loading, fields]);

  const focusField = (f: Field) => {
    setSelectedId(f.id);
    if (mapInstance.current && f.lat != null && f.lng != null && window.L) {
      mapInstance.current.setView([f.lat, f.lng], 15);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-200 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-zinc-900 rounded-3xl border border-white/5 p-6 md:p-8 mb-6 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-400 mb-2">
              <Sparkles className="w-4 h-4" /> Hệ thống định vị
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2.5">
              <MapPin className="w-7 h-7 text-yellow-500" />
              Bản Đồ Cụm Sân Thể Thao
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Khám phá và định vị nhanh các cụm sân bóng rổ gần bạn nhất.
            </p>
          </div>

          <Link
            to="/fields"
            className="btn-outline px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap self-start sm:self-center"
          >
            Xem danh sách dạng lưới →
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
            <p className="text-gray-400 text-sm font-medium">Đang tải vị trí các sân...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar list */}
            <div className="lg:col-span-1 space-y-3 max-h-[72vh] overflow-y-auto pr-2 custom-scrollbar">
              {fields.map((f) => {
                const active = selectedId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => focusField(f)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${
                      active
                        ? "bg-zinc-900 border-yellow-500 ring-2 ring-yellow-500/20 shadow-lg shadow-yellow-500/10"
                        : "bg-zinc-900/60 border-white/5 hover:border-yellow-500/30 hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-extrabold text-white text-sm line-clamp-1">{f.name}</div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 shrink-0 ml-2">
                        {f.sportLabel || f.type}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 mt-1 flex items-start gap-1.5 line-clamp-2">
                      <MapPin className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
                      {f.address}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-xs">
                      <span className="text-yellow-400 font-bold">
                        {formatCurrency(f.priceFrom || f.pricePerHour)} / h
                      </span>

                      <div className="flex items-center gap-3">
                        <Link
                          to={`/field/${f.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-gray-300 hover:text-yellow-400 transition-colors"
                        >
                          Chi tiết
                        </Link>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${
                            f.lat != null ? `${f.lat},${f.lng}` : encodeURIComponent(f.address)
                          }`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-yellow-400 hover:underline flex items-center gap-1"
                        >
                          <Navigation className="w-3 h-3" /> Chỉ đường
                        </a>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Map Container */}
            <div className="lg:col-span-2">
              <div
                ref={mapRef}
                className="w-full h-[72vh] min-h-[450px] rounded-3xl border border-white/10 overflow-hidden bg-zinc-900 shadow-2xl z-0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
