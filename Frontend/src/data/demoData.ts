import type { Booking, Court, Field } from "../lib/api";
import banner from "../assets/banner.jpg";
import banner2 from "../assets/banner2.jpg";

export type FieldReview = {
  id: number;
  author: string;
  initial: string;
  rating: number;
  date: string;
  comment: string;
};

const demoImages = [banner2, banner, banner2, banner, banner2, banner, banner2];

const baseDemoFields: Field[] = [
  { id: 101, name: "GoldenState Arena Quận 7", sport: "Bóng Rổ", sportLabel: "Bóng rổ", address: "28 Nguyễn Hữu Thọ, Quận 7, TP. Hồ Chí Minh", city: "Hồ Chí Minh", phone: "0812288111", openTime: "06:00", closeTime: "23:00", description: "Cụm sân bóng rổ trong nhà chuẩn thi đấu, có phòng thay đồ, nước uống và bãi xe rộng.", image: demoImages[0], courtCount: 3, priceFrom: 180000, status: "active", rating: 4.9, lat: 10.7296, lng: 106.6993 },
  { id: 102, name: "Hoop Arena Thảo Điền", sport: "Bóng Rổ", sportLabel: "Bóng rổ", address: "12 Quốc Hương, Thủ Đức, TP. Hồ Chí Minh", city: "Hồ Chí Minh", phone: "0909123456", openTime: "06:00", closeTime: "22:30", description: "Sân tiêu chuẩn 3x3 và 5x5, phù hợp tập luyện nhóm và tổ chức giải nhỏ.", image: demoImages[1], courtCount: 2, priceFrom: 150000, status: "active", rating: 4.8, lat: 10.8031, lng: 106.7401 },
  { id: 103, name: "Sky Court Bình Thạnh", sport: "Bóng Rổ", sportLabel: "Bóng rổ", address: "86 Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh", city: "Hồ Chí Minh", phone: "0938123456", openTime: "05:30", closeTime: "22:00", description: "Sân ngoài trời thoáng, đèn LED ban đêm và khu ngồi chờ cho đội chơi.", image: demoImages[2], courtCount: 2, priceFrom: 130000, status: "active", rating: 4.7, lat: 10.8006, lng: 106.7169 },
  { id: 105, name: "West Lake Basketball Hub", sport: "Bóng Rổ", sportLabel: "Bóng rổ", address: "45 Võ Chí Công, Tây Hồ, Hà Nội", city: "Hà Nội", phone: "02437668888", openTime: "06:00", closeTime: "22:30", description: "Cụm sân hiện đại dành cho đội phong trào, có huấn luyện viên theo lịch.", image: demoImages[4], courtCount: 3, priceFrom: 160000, status: "active", rating: 4.8, lat: 21.072, lng: 105.8168 },
  { id: 106, name: "Đà Nẵng 3x3 Court", sport: "Bóng Rổ", sportLabel: "Bóng rổ", address: "19 Trần Hưng Đạo, Sơn Trà, Đà Nẵng", city: "Đà Nẵng", phone: "02363881111", openTime: "06:00", closeTime: "23:00", description: "Sân 3x3 sát sông Hàn, có hệ thống đèn chiếu sáng và khu vực check-in.", image: demoImages[5], courtCount: 2, priceFrom: 140000, status: "active", rating: 4.7, lat: 16.068, lng: 108.232 },
];

type DemoFieldSeed = [number, string, string, string, string, string, number, number, number];
const extraDemoFields: Field[] = ([
  [115, "Hoops Academy Quận 1", "Bóng Rổ", "Bóng rổ", "72 Nguyễn Bỉnh Khiêm, Quận 1, TP. Hồ Chí Minh", "Hồ Chí Minh", 10.79, 106.704, 190000],
] as DemoFieldSeed[]).map(([id, name, sport, sportLabel, address, city, lat, lng, priceFrom], index) => ({
  id, name, sport, sportLabel, address, city, lat, lng, priceFrom,
  phone: "0812288111", openTime: "06:00", closeTime: "22:30",
  description: `Cơ sở ${sportLabel.toLowerCase()} chất lượng cao, phù hợp tập luyện và thi đấu cùng đội nhóm.`,
  image: demoImages[index % demoImages.length], courtCount: 3,
  status: "active", rating: 4.6 + (index % 4) / 10,
}));

export const demoFields: Field[] = [...baseDemoFields, ...extraDemoFields];

export const demoCourts: Court[] = demoFields.flatMap((field, index) =>
  Array.from({ length: Math.min(field.courtCount, 3) }, (_, courtIndex) => ({
    id: field.id * 10 + courtIndex + 1,
    fieldId: field.id,
    name: `${courtIndex === 0 ? "Sân trung tâm" : "Sân"} ${courtIndex + 1}`,
    type: field.sportLabel,
    price: field.priceFrom + courtIndex * 20000,
    status: index === 2 && courtIndex === 2 ? "maintenance" : "active",
    capacity: 10,
  }))
);

export const getDemoField = (id: string | number | undefined) => demoFields.find((field) => field.id === Number(id));
export const getDemoCourts = (fieldId?: string | number) => fieldId == null ? demoCourts : demoCourts.filter((court) => court.fieldId === Number(fieldId));

/** Nội dung minh hoạ khi API cơ sở chưa cung cấp album ảnh và đánh giá. */
export function getFieldGallery(field: Pick<Field, "image" | "imageUrl">) {
  return Array.from(new Set([field.image, field.imageUrl, banner2, banner].filter(Boolean))) as string[];
}

export function getFieldReviews(fieldId: number): FieldReview[] {
  const reviewSets: FieldReview[][] = [
    [
      { id: 1, author: "Minh Anh", initial: "MA", rating: 5, date: "12/09/2026", comment: "Sân sạch, đèn sáng và nhân viên hỗ trợ nhanh. Nhóm mình đặt buổi tối vẫn chơi rất thoải mái." },
      { id: 2, author: "Quang Huy", initial: "QH", rating: 5, date: "05/09/2026", comment: "Đặt lịch dễ, mặt sân ổn và có chỗ gửi xe. Sẽ quay lại cùng đội vào tuần sau." },
      { id: 3, author: "Ngọc Lan", initial: "NL", rating: 4, date: "28/08/2026", comment: "Không gian tốt, khu chờ gọn gàng. Nếu có thêm nước uống lạnh thì sẽ tuyệt hơn." },
    ],
    [
      { id: 4, author: "Đức Thành", initial: "ĐT", rating: 5, date: "16/09/2026", comment: "Chất lượng sân đúng như hình, giờ cao điểm vẫn được sắp xếp rất chuyên nghiệp." },
      { id: 5, author: "Thu Hà", initial: "TH", rating: 4, date: "02/09/2026", comment: "Vị trí dễ tìm, nhân viên thân thiện. Đội mình có trải nghiệm khá tốt." },
      { id: 6, author: "Hoài Nam", initial: "HN", rating: 5, date: "21/08/2026", comment: "Hệ thống đèn và mặt sân đẹp, phù hợp thi đấu hoặc tập ném cùng đội." },
    ],
  ];

  return reviewSets[fieldId % reviewSets.length];
}

export function createDemoBookings(customer: Pick<Booking["customer"], "fullName" | "phone" | "email" | "userId">): Booking[] {
  const today = new Date();
  const dateAt = (offset: number) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  return [
    { id: 9001, fieldId: 101, courtId: 1011, fieldName: demoFields[0].name, court: "Sân trung tâm 1", date: dateAt(1), time: "19:00", duration: 2, total: 360000, customer: { ...customer, note: "Đội Golden Warriors" }, paymentMethod: "deposit", paymentStatus: "paid", status: "confirmed", createdAt: new Date().toISOString() },
    { id: 9002, fieldId: 102, courtId: 1021, fieldName: demoFields[1].name, court: "Sân trung tâm 1", date: dateAt(4), time: "18:30", duration: 1, total: 150000, customer: { ...customer, note: "Demo booking" }, paymentMethod: "cash", paymentStatus: "unpaid", status: "pending", createdAt: new Date().toISOString() },
    { id: 9003, fieldId: 103, courtId: 1032, fieldName: demoFields[2].name, court: "Sân 2", date: dateAt(-3), time: "20:00", duration: 2, total: 300000, customer: { ...customer, note: "Demo booking" }, paymentMethod: "full", paymentStatus: "paid", status: "completed", createdAt: new Date().toISOString() },
  ];
}
