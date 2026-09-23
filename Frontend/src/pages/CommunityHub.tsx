import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { CalendarDays, ChevronRight, MapPin, Medal, Search, Star, UserPlus, Users } from "lucide-react";
import { clubs, rankings, tournaments } from "../data/marketplaceMock";

type HubMode = "clubs" | "tournaments" | "rankings";

const clubTone = {
  navy: "bg-slate-950 text-yellow-400",
  amber: "bg-amber-400 text-slate-950",
  emerald: "bg-emerald-600 text-white",
  blue: "bg-sky-600 text-white",
};

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

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Link to="/" className="hover:text-amber-600">Trang chủ</Link><ChevronRight className="h-3.5 w-3.5" /><span className="text-amber-600">Cộng đồng</span></div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-500">{description}</p>
          <nav className="mt-8 flex gap-2 overflow-x-auto pb-1" aria-label="Danh mục cộng đồng">
            {tabs.map((tab) => <Link key={tab.to} to={tab.to} className={"whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition " + (tab.mode === mode ? "bg-amber-400 text-slate-950" : "border border-slate-200 text-slate-600 hover:border-amber-300")}>{tab.label}</Link>)}
          </nav>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        {!isTournaments && !isClubs ? <RankingsTable /> : <>
          <div className="mb-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><Search className="ml-1 h-5 w-5 shrink-0 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isClubs ? "Tìm CLB, khu vực..." : "Tìm giải đấu, địa điểm..."} className="h-10 min-w-0 flex-1 outline-none placeholder:text-slate-400" /></div>
          {isClubs ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{filteredClubs.map((club) => {
            const joinedClub = joined.includes(club.id);
            return <article key={club.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className={"flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-black " + clubTone[club.tone]}>{club.initials}</div>
              <p className="mt-6 text-xs font-bold uppercase tracking-wider text-amber-600">{club.sport}</p><h2 className="mt-1 text-xl font-extrabold text-slate-950">{club.name}</h2>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" />{club.area}</p>
              <div className="mt-5 flex items-center justify-between border-y border-slate-100 py-4 text-sm"><span className="inline-flex items-center gap-1.5 text-slate-600"><Users className="h-4 w-4" />{club.members} thành viên</span><span className="inline-flex items-center gap-1 font-bold"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{club.rating}</span></div>
              <button type="button" onClick={() => { setJoined((items) => joinedClub ? items.filter((id) => id !== club.id) : [...items, club.id]); toast.success(joinedClub ? "Đã rời " + club.name : "Đã gửi yêu cầu tham gia " + club.name); }} className={"mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold " + (joinedClub ? "bg-emerald-50 text-emerald-700" : "bg-slate-950 text-white hover:bg-slate-800")}><UserPlus className="h-4 w-4" />{joinedClub ? "Đã gửi yêu cầu" : "Tham gia CLB"}</button>
            </article>;
          })}</div> : <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{filteredTournaments.map((tournament) => {
            const registeredTournament = registered.includes(tournament.id);
            return <article key={tournament.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="relative h-52 overflow-hidden"><img src={tournament.image} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" /><span className="absolute left-4 top-4 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-extrabold text-white">{tournament.status}</span><span className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-[0.14em] text-yellow-300">{tournament.sport}</span></div>
              <div className="p-6"><h2 className="text-2xl font-extrabold leading-tight text-slate-950">{tournament.name}</h2><div className="mt-5 space-y-2 text-sm text-slate-500"><p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-amber-500" />{tournament.date}</p><p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-500" />{tournament.location}</p><p className="flex items-center gap-2"><Users className="h-4 w-4 text-amber-500" />{tournament.teams} đội tham dự</p></div><button type="button" onClick={() => { setRegistered((items) => registeredTournament ? items : [...items, tournament.id]); toast.success("Đã ghi nhận đăng ký demo cho " + tournament.name); }} className={"mt-6 h-11 w-full rounded-xl text-sm font-extrabold " + (registeredTournament ? "bg-emerald-50 text-emerald-700" : "bg-slate-950 text-white hover:bg-slate-800")}>{registeredTournament ? "Đã ghi nhận đăng ký" : "Đăng ký đội"}</button></div>
            </article>;
          })}</div>}
        </>}
      </div>
    </div>
  );
}

function RankingsTable() {
  return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="grid grid-cols-[34px_minmax(0,1fr)_44px_48px] gap-2 bg-slate-950 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:grid-cols-[50px_minmax(0,1fr)_60px_60px_60px_70px] sm:px-5"><span>#</span><span className="text-left">Câu lạc bộ</span><span>Trận</span><span className="hidden sm:block">Thắng</span><span className="hidden sm:block">Thua</span><span>Điểm</span></div>
    {rankings.map((team) => <div key={team.rank} className="grid grid-cols-[34px_minmax(0,1fr)_44px_48px] items-center gap-2 border-t border-slate-100 px-3 py-4 text-center text-sm sm:grid-cols-[50px_minmax(0,1fr)_60px_60px_60px_70px] sm:px-5"><span className={team.rank <= 3 ? "font-black text-amber-600" : "font-black text-slate-400"}>{team.rank}</span><span className="flex min-w-0 items-center gap-3 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-700">{team.initials}</span><span className="truncate font-extrabold text-slate-900">{team.name}</span></span><span className="text-slate-500">{team.matches}</span><span className="hidden font-bold text-emerald-600 sm:block">{team.won}</span><span className="hidden text-slate-500 sm:block">{team.lost}</span><span className="font-black text-slate-950">{team.points}</span></div>)}
    <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-500"><Medal className="h-5 w-5 text-amber-500" />Bảng xếp hạng demo của GoldenState League 2026.</div>
  </div>;
}
