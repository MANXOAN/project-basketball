export type MajorCity = { code: number; name: string };
export type District = { code: number; name: string };

export const majorCities: MajorCity[] = [
  { code: 1, name: "Hà Nội" },
  { code: 79, name: "Hồ Chí Minh" },
  { code: 48, name: "Đà Nẵng" },
];

const cache = new Map<number, District[]>();

export async function fetchDistricts(provinceCode: number): Promise<District[]> {
  const cached = cache.get(provinceCode);
  if (cached) return cached;
  const response = await fetch(`https://provinces.open-api.vn/api/v1/p/${provinceCode}?depth=2`);
  if (!response.ok) throw new Error("Không tải được quận/huyện");
  const data = await response.json() as { districts?: District[] };
  const districts = data.districts || [];
  cache.set(provinceCode, districts);
  return districts;
}
