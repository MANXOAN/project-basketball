import type { Field } from "../lib/api";
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
