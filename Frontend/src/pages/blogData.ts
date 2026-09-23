export type BlogPost = {
  id: number;
  title: string;
  category: string;
  image: string;
  desc: string;
  date: string;
  content: string[];
};

export const blogs: BlogPost[] = [
  {
    id: 1,
    title: "Top 10 phần mềm quản lý sân tốt nhất",
    category: "Phần mềm",
    image: "https://munichgroup.vn/wp-content/uploads/san-bong-ro-dep-9-1.webp",
    desc: "Mẫu sân bóng rổ đẹp – sành điệu được giới trẻ yêu thích.",
    date: "31/07/2026",
    content: [
      "Một sân bóng được vận hành tốt cần nhiều hơn một mặt sân đẹp. Người quản lý cần theo dõi lịch đặt, doanh thu, tình trạng sân và trải nghiệm của người chơi trong cùng một quy trình.",
      "Các nền tảng quản lý sân hiện nay giúp tự động hóa những công việc lặp lại như xác nhận lịch, nhắc giờ chơi, cập nhật giá và tổng hợp báo cáo. Nhờ đó, chủ sân có thêm thời gian tập trung vào chất lượng dịch vụ.",
      "Khi lựa chọn phần mềm, hãy ưu tiên giao diện dễ dùng, khả năng quản lý nhiều sân, hỗ trợ thanh toán online và kết nối với khách hàng trên nhiều thiết bị.",
    ],
  },
  {
    id: 2,
    title: "Kinh nghiệm kinh doanh sân bóng rổ hiệu quả",
    category: "Kinh doanh",
    image: "https://bizweb.dktcdn.net/100/180/757/files/kich-thuoc-san-bong-ro-tre-em-la-bao-nhieu.jpg?v=1531377224399",
    desc: "Những kinh nghiệm giúp tăng doanh thu sân bóng.",
    date: "30/07/2026",
    content: [
      "Kinh doanh sân bóng hiệu quả bắt đầu từ việc hiểu rõ khách hàng mục tiêu và xây dựng lịch vận hành phù hợp với nhu cầu thực tế trong khu vực.",
      "Bên cạnh chất lượng mặt sân, các yếu tố như ánh sáng, phòng thay đồ, bãi đỗ xe và cách nhân viên hỗ trợ cũng ảnh hưởng trực tiếp đến khả năng khách quay lại.",
      "Chủ sân nên theo dõi các khung giờ cao điểm, triển khai gói đặt sân theo nhóm và duy trì nội dung truyền thông đều đặn để tối ưu công suất sân.",
    ],
  },
  {
    id: 3,
    title: "Xu hướng sân bóng rổ năm 2026",
    category: "Xu hướng",
    image: "https://www.myuc.vn/uploads/products/2023/03/24/3.jpg",
    desc: "Những xu hướng nổi bật trong vận hành và trải nghiệm sân bóng rổ.",
    date: "29/07/2026",
    content: [
      "Năm 2026, người chơi quan tâm nhiều hơn đến trải nghiệm trọn vẹn thay vì chỉ thuê một khung giờ. Các sân có không gian sạch, dịch vụ rõ ràng và đặt lịch thuận tiện đang tạo được lợi thế lớn.",
      "Đặt sân trên điện thoại, thanh toán không tiền mặt và nhận thông báo tự động dần trở thành tiêu chuẩn quen thuộc của người chơi hiện đại.",
      "Trong thời gian tới, những cơ sở biết kết hợp cộng đồng bóng rổ, giải đấu phong trào và dữ liệu vận hành sẽ có nhiều cơ hội phát triển bền vững.",
    ],
  },
];
