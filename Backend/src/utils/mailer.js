import nodemailer from "nodemailer";

export async function sendMail(to, subject, html) {
    if (!to || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("Email skipped: missing recipient or EMAIL_USER/EMAIL_PASS configuration");
        return false;
    }
    try {
        console.log(`\n\n=== CHUẨN BỊ GỬI EMAIL ĐẾN: ${to} ===`);

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Hệ thống Sân Bóng" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });

        console.log("Thành công! Đã gửi mail cho:", to);
        console.log("--------------------------------------------------------------\n");

        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}
