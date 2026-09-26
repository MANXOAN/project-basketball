import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { CalendarDays, Check, ChevronRight, MapPin, Medal, Search, Star, Trophy, UserPlus, Users } from "lucide-react";
import { clubs, rankings, tournaments } from "../data/marketplaceMock";

type HubMode = "clubs" | "tournaments" | "rankings";

const clubTone = {
  navy: "bg-brand-600 text-white",
  amber: "bg-brand-100 text-brand-800",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  blue: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
};

const revealAt = (index: number) => ({ "--reveal-index": index } as CSSProperties);

function EmptyResult({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-brand-200 bg-white px-6 py-16 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Search className="h-6 w-6" /></span>
      <h2 className="mt-5 text-xl font-extrabold text-stone-950">Không tìm thấy {label} phù hợp</h2>
      <p className="mt-2 text-sm text-stone-500">Thử từ khóa khác hoặc tên khu vực gần bạn.</p>
    </div>
  );
}

const tabs: { to: string; label: string; mode: HubMode }[] = [
  { to: "/clubs", label: "Câu lạc bộ", mode: "clubs" },
  { to: "/tournaments", label: "Giải đấu", mode: "tournaments" },
  { to: "/rankings", label: "Bảng xếp hạng", mode: "rankings" },
];

export default function CommunityHub({ mode }: { mode: HubMode }) {
  const [query, setQuery] = useState("");
  const [joined, setJoined] = useState<number[]>([]);
  const [registered, setRegistered] = useState<number[]>([]);
  const isClubs = mode === "clubs";
  const isTournaments = mode === "tournaments";
  const title = isClubs ? "Câu lạc bộ bóng rổ gần bạn" : isTournaments ? "Giải bóng rổ sắp diễn ra" : "Bảng xếp hạng mùa giải";
  const description = isClubs ? "Tìm đồng đội, tham gia buổi tập và xây dựng cộng đồng cùng đam mê." : isTournaments ? "Theo dõi lịch thi đấu, đăng ký đội và chinh phục những bảng đấu mới." : "Cập nhật thành tích của các câu lạc bộ trong GoldenState League.";
  const filteredClubs = useMemo(() => clubs.filter((club) => (club.name + " " + club.area + " " + club.sport).toLowerCase().includes(query.toLowerCase())), [query]);
  const filteredTournaments = useMemo(() => tournaments.filter((item) => (item.name + " " + item.location + " " + item.sport).toLowerCase().includes(query.toLowerCase())), [query]);

  const TabIcon = isClubs ? Users : isTournaments ? Trophy : Medal;

  return (
    <div className="min-h-screen bg-surface text-stone-900">
      <section className="relative overflow-hidden border-b border-stone-200/70 bg-white">
        <div className="brand-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black_15%,transparent_65%)]" aria-hidden />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500"><Link to="/" className="hover:text-brand-700">Trang chủ</Link><ChevronRight className="h-3.5 w-3.5" /><span className="text-brand-700">Cộng đồng</span></nav>
          <div key={mode} className="animate-fade-in-up">
            <h1 className="mt-5 flex items-center gap-3 text-[2.1rem] font-extrabold leading-tight tracking-tight text-stone-950 sm:text-5xl">
              <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-brand sm:flex"><TabIcon className="h-7 w-7" /></span>
              {title}
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-stone-500">{description}</p>
          </div>
          <nav className="mt-8 inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-stone-200 bg-stone-50 p-1" aria-label="Danh mục cộng đồng">
            {tabs.map((tab) => <Link key={tab.to} to={tab.to} aria-current={tab.mode === mode ? "page" : undefined} className={"inline-flex min-h-11 items-center whitespace-nowrap rounded-xl px-4 text-sm font-bold transition " + (tab.mode === mode ? "bg-white text-brand-700 shadow-soft ring-1 ring-stone-200" : "text-stone-600 hover:text-stone-900")}>{tab.label}</Link>)}
          </nav>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        {!isTournaments && !isClubs ? <RankingsTable /> : <>
          <label className="mb-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-stone-200 bg-white p-2 pl-4 shadow-soft transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
            <Search className="h-5 w-5 shrink-0 text-stone-400" />
            <span className="sr-only">{isClubs ? "Tìm câu lạc bộ" : "Tìm giải đấu"}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isClubs ? "Tìm CLB, khu vực..." : "Tìm giải đấu, địa điểm..."} className="h-10 min-w-0 flex-1 bg-transparent text-sm font-medium text-stone-900 outline-none placeholder:text-stone-400" />
          </label>
          {isClubs ? (filteredClubs.length === 0 ? <EmptyResult label="câu lạc bộ" /> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{filteredClubs.map((club, index) => {
            const joinedClub = joined.includes(club.id);
            return <div key={club.id} data-reveal style={revealAt(index)}><article className="hover-lift flex h-full flex-col rounded-3xl border border-stone-200 bg-white p-6 shadow-soft hover:border-brand-200">
              <div className="flex items-start justify-between">
                <div className={"flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black " + clubTone[club.tone]}>{club.initials}</div>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-extrabold text-stone-800"><Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />{club.rating}</span>
              </div>
              <p className="mt-6 text-xs font-bold uppercase tracking-wider text-brand-700">{club.sport}</p><h2 className="mt-1 text-xl font-extrabold text-stone-950">{club.name}</h2>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500"><MapPin className="h-4 w-4 text-stone-400" />{club.area}</p>
              <p className="mt-5 flex items-center gap-1.5 border-t border-stone-100 pt-4 text-sm font-semibold text-stone-600"><Users className="h-4 w-4 text-brand-600" />{club.members} thành viên</p>
              <div className="mt-auto pt-5"><button type="button" onClick={() => { setJoined((items) => joinedClub ? items.filter((id) => id !== club.id) : [...items, club.id]); toast.success(joinedClub ? "Đã rời " + club.name : "Đã gửi yêu cầu tham gia " + club.name); }} className={"flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition " + (joinedClub ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "btn-primary")}>{joinedClub ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}{joinedClub ? "Đã gửi yêu cầu" : "Tham gia CLB"}</button></div>
            </article></div>;
          })}</div>) : (filteredTournaments.length === 0 ? <EmptyResult label="giải đấu" /> : <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{filteredTournaments.map((tournament, index) => {
            const registeredTournament = registered.includes(tournament.id);
            return <div key={tournament.id} data-reveal style={revealAt(index)}><article className="hover-lift group flex h-full flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-soft">
              <div className="zoom-media relative h-52"><img src={tournament.image} alt={tournament.name} loading="lazy" className="h-full w-full object-cover" /><div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-stone-950/70 to-transparent" /><span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{tournament.status}</span><span className="absolute bottom-4 left-4 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">{tournament.sport}</span></div>
              <div className="flex flex-1 flex-col p-6"><h2 className="text-xl font-extrabold leading-tight text-stone-950 sm:text-2xl">{tournament.name}</h2><div className="mt-4 space-y-2.5 text-sm text-stone-600"><p className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4 text-brand-600" />{tournament.date}</p><p className="flex items-center gap-2.5"><MapPin className="h-4 w-4 text-brand-600" />{tournament.location}</p><p className="flex items-center gap-2.5"><Users className="h-4 w-4 text-brand-600" />{tournament.teams} đội tham dự</p></div><div className="mt-auto pt-6"><button type="button" onClick={() => { setRegistered((items) => registeredTournament ? items : [...items, tournament.id]); toast.success("Đã ghi nhận đăng ký demo cho " + tournament.name); }} className={"flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition " + (registeredTournament ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "btn-primary")}>{registeredTournament && <Check className="h-4 w-4" />}{registeredTournament ? "Đã ghi nhận đăng ký" : "Đăng ký đội"}</button></div></div>
            </article></div>;
          })}</div>)}
        </>}
      </div>
    </div>
  );
}

function RankingsTable() {
  return <div data-reveal className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-soft">
    <div className="grid grid-cols-[34px_minmax(0,1fr)_44px_48px] gap-2 bg-stone-50 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-stone-500 sm:grid-cols-[50px_minmax(0,1fr)_60px_60px_60px_70px] sm:px-5"><span>#</span><span className="text-left">Câu lạc bộ</span><span>Trận</span><span className="hidden sm:block">Thắng</span><span className="hidden sm:block">Thua</span><span>Điểm</span></div>
    {rankings.map((team) => <div key={team.rank} className="grid grid-cols-[34px_minmax(0,1fr)_44px_48px] items-center gap-2 border-t border-stone-100 px-3 py-4 text-center text-sm transition-colors hover:bg-brand-50/50 sm:grid-cols-[50px_minmax(0,1fr)_60px_60px_60px_70px] sm:px-5"><span className={"mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-black " + (team.rank === 1 ? "bg-brand-600 text-white" : team.rank <= 3 ? "bg-brand-100 text-brand-800" : "text-stone-500")}>{team.rank}</span><span className="flex min-w-0 items-center gap-3 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-xs font-black text-stone-700">{team.initials}</span><span className="truncate font-extrabold text-stone-900">{team.name}</span></span><span className="text-stone-500">{team.matches}</span><span className="hidden font-bold text-emerald-700 sm:block">{team.won}</span><span className="hidden text-stone-500 sm:block">{team.lost}</span><span className="font-black text-stone-950">{team.points}</span></div>)}
    <div className="flex items-center gap-3 border-t border-stone-100 bg-stone-50 px-5 py-4 text-sm text-stone-500"><Medal className="h-5 w-5 text-brand-600" />Bảng xếp hạng demo của GoldenState League 2026.</div>
  </div>;
}
