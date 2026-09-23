import banner from "../assets/banner.jpg";
import banner2 from "../assets/banner2.jpg";

export type ClubPreview = {
  id: number;
  name: string;
  initials: string;
  sport: string;
  area: string;
  members: number;
  rating: number;
  tone: "navy" | "amber" | "emerald" | "blue";
};

export type TournamentPreview = {
  id: number;
  name: string;
  sport: string;
  location: string;
  date: string;
  teams: number;
  status: string;
  image: string;
};

export const locationOptions: Record<string, string[]> = {
  "Hồ Chí Minh": ["Tất cả khu vực", "Quận 1", "Quận 3", "Quận 7", "Bình Thạnh", "Thủ Đức"],
  "Hà Nội": ["Tất cả khu vực", "Cầu Giấy", "Đống Đa", "Hai Bà Trưng", "Nam Từ Liêm"],
  "Đà Nẵng": ["Tất cả khu vực", "Hải Châu", "Sơn Trà", "Thanh Khê"],
};

export const clubs: ClubPreview[] = [
  { id: 1, name: "Golden Warriors", initials: "GW", sport: "Bóng rổ", area: "Quận 7", members: 38, rating: 4.9, tone: "navy" },
  { id: 2, name: "Saigon Ballers", initials: "SB", sport: "Bóng rổ", area: "Bình Thạnh", members: 52, rating: 4.8, tone: "amber" },
  { id: 3, name: "Next Gen Hoops", initials: "NG", sport: "Bóng rổ", area: "Thủ Đức", members: 31, rating: 4.7, tone: "emerald" },
  { id: 4, name: "Downtown Dunkers", initials: "DD", sport: "Bóng rổ", area: "Quận 3", members: 44, rating: 4.8, tone: "blue" },
];

export const tournaments: TournamentPreview[] = [
  {
    id: 1,
    name: "GoldenState 3x3 Open 2026",
    sport: "Bóng rổ 3x3",
    location: "GoldenState Arena, Quận 7",
    date: "12/10/2026",
    teams: 16,
    status: "Đang mở đăng ký",
    image: banner2,
  },
  {
    id: 2,
    name: "Saigon Weekend League",
    sport: "Bóng rổ 5x5",
    location: "Nhà thi đấu Phú Thọ",
    date: "25/10/2026",
    teams: 12,
    status: "Sắp diễn ra",
    image: banner,
  },
  {
    id: 3,
    name: "Rookie Cup U18",
    sport: "Bóng rổ trẻ",
    location: "Thủ Đức, TP. Hồ Chí Minh",
    date: "08/11/2026",
    teams: 20,
    status: "Nhận hồ sơ",
    image: banner2,
  },
];

export const rankings = [
  { rank: 1, name: "Golden Warriors", matches: 12, won: 10, drawn: 0, lost: 2, points: 30, initials: "GW" },
  { rank: 2, name: "Saigon Ballers", matches: 12, won: 9, drawn: 0, lost: 3, points: 27, initials: "SB" },
  { rank: 3, name: "Next Gen Hoops", matches: 12, won: 8, drawn: 0, lost: 4, points: 24, initials: "NG" },
  { rank: 4, name: "Downtown Dunkers", matches: 12, won: 7, drawn: 0, lost: 5, points: 21, initials: "DD" },
  { rank: 5, name: "City Lights", matches: 12, won: 6, drawn: 0, lost: 6, points: 18, initials: "CL" },
];
