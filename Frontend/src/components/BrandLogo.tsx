import { Link } from "react-router-dom";

type Props = {
  to?: string;
  subtitle?: string;
  inverted?: boolean;
  className?: string;
};

/** Biểu tượng quả bóng rổ vẽ bằng SVG để sắc nét ở mọi kích thước. */
export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span className={`relative inline-grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-[0_8px_18px_-8px_rgb(207_74_12/0.7)] ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[58%] w-[58%] text-white" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3v18" />
        <path d="M5.6 5.6c2.6 2.2 3.9 4.3 3.9 6.4s-1.3 4.2-3.9 6.4M18.4 5.6c-2.6 2.2-3.9 4.3-3.9 6.4s1.3 4.2 3.9 6.4" />
      </svg>
    </span>
  );
}

export default function BrandLogo({ to = "/", subtitle = "Basketball Booking", inverted = false, className = "" }: Props) {
  return (
    <Link to={to} className={`group inline-flex shrink-0 items-center gap-2.5 rounded-xl ${className}`} aria-label="GoldenState — về trang chủ">
      <BrandMark className="h-10 w-10 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:rotate-[20deg] group-hover:scale-105" />
      <span className="leading-none">
        <span className={`block text-lg font-extrabold tracking-tight ${inverted ? "text-white" : "text-stone-950"}`}>
          Golden<span className={inverted ? "text-brand-300" : "text-brand-600"}>State</span>
        </span>
        <span className={`mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] ${inverted ? "text-white/70" : "text-stone-500"}`}>{subtitle}</span>
      </span>
    </Link>
  );
}
