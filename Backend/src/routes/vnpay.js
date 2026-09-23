import express from "express";
import crypto from "crypto";
import Booking from "../models/Booking";
import Payment from "../models/Payment";
import { expirePendingPayments } from "../controllers/booking";

const router = express.Router();
const moment = require('moment');
const qs = require('qs');

const VNPAY_URL = process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

function getClientIp(req) {
    const forwardedFor = req.headers["x-forwarded-for"];
    return (typeof forwardedFor === "string" ? forwardedFor.split(",")[0] : forwardedFor?.[0]) ||
        req.socket.remoteAddress ||
        "127.0.0.1";
}

function sortObject(obj) {
    const sorted = {};
    const str = [];
    let key;
    for (key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

router.post('/create-url', async function (req, res, next) {
    try {
        await expirePendingPayments();
        const date = new Date();
        const createDate = moment(date).format('YYYYMMDDHHmmss');
        
        const ipAddr = getClientIp(req);
        const tmnCode = process.env.VNP_TMN_CODE;
        const secretKey = process.env.VNP_HASH_SECRET;
        const returnUrl = process.env.VNP_RETURN_URL || "http://localhost:5173/vnpay-return";

        if (!tmnCode || !secretKey) {
            return res.status(500).json({ message: "Thiếu cấu hình VNPay trên Backend" });
        }

        const orderId = String(req.body.orderId || "");
        const requestedAmount = Number(req.body.amount);
        const paymentKind = ["deposit", "balance", "full"].includes(req.body.paymentKind)
            ? req.body.paymentKind
            : "full";
        if (!/^\d+$/.test(orderId) || !Number.isInteger(requestedAmount) || requestedAmount <= 0) {
            return res.status(400).json({ message: "orderId hoặc amount không hợp lệ" });
        }
        const booking = await Booking.findOne({ id: Number(orderId) });
        if (!booking) {
            return res.status(404).json({ message: "Không tìm thấy đơn đặt sân" });
        }
        if (booking.status === "cancelled") {
            return res.status(400).json({ message: "Đơn đã hết hạn hoặc đã hủy" });
        }
        const paidAmount = Number(booking.paidAmount) || (booking.paymentStatus === "deposit_paid" ? Math.round(Number(booking.total) * 0.3) : 0);
        const expectedAmount = paymentKind === "deposit"
            ? Math.round(Number(booking.total) * 0.3)
            : paymentKind === "balance"
                ? Math.max(0, Number(booking.total) - paidAmount)
                : Number(booking.total);
        if (expectedAmount <= 0 || requestedAmount !== expectedAmount) {
            return res.status(400).json({ message: "Số tiền thanh toán không khớp với số tiền còn phải trả" });
        }
        if (paymentKind === "balance" && booking.paymentStatus !== "deposit_paid") {
            return res.status(400).json({ message: "Chỉ có thể thanh toán phần còn lại cho đơn đã đặt cọc" });
        }
        const paymentCode = `${booking.id}_${paymentKind}_${Date.now()}`;
        const amount = expectedAmount;
        const bankCode = req.body.bankCode;
        
        let locale = req.body.language;
        if (!locale || locale === '') {
            locale = 'vn';
        }
        const currCode = 'VND';
        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = locale;
        vnp_Params['vnp_CurrCode'] = currCode;
        vnp_Params['vnp_TxnRef'] = paymentCode;
        vnp_Params['vnp_OrderInfo'] = `Thanh toan ${paymentKind} cho ma don hang:${orderId}`;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;
        if (bankCode !== null && bankCode !== '' && bankCode !== undefined) {
            vnp_Params['vnp_BankCode'] = bankCode;
        }

        vnp_Params = sortObject(vnp_Params);

        const signData = qs.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;

        await Payment.findOneAndUpdate(
            { paymentCode },
            {
                bookingId: booking.id,
                paymentCode,
                transactionCode: "",
                gateway: "vnpay",
                amount,
                paymentKind,
                currency: "VND",
                status: "pending",
                rawData: vnp_Params,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.json({ paymentUrl: `${VNPAY_URL}?${qs.stringify(vnp_Params, { encode: false })}` });
    } catch (error) {
        console.error("Lỗi VNPAY:", error);
        return res.status(500).json({ message: "Lỗi tạo link thanh toán", error: error.message });
    }
});

router.get("/return", async (req, res) => {
    try {
        const secureHash = String(req.query.vnp_SecureHash || "");
        const vnp_Params = { ...req.query };
        delete vnp_Params.vnp_SecureHash;
        delete vnp_Params.vnp_SecureHashType;

        const signData = qs.stringify(sortObject(vnp_Params), { encode: false });
        const signed = crypto.createHmac("sha512", process.env.VNP_HASH_SECRET || "")
            .update(Buffer.from(signData, "utf-8"))
            .digest("hex");
        const validSignature = secureHash.length === signed.length &&
            crypto.timingSafeEqual(Buffer.from(secureHash), Buffer.from(signed));

        const paymentCode = String(vnp_Params.vnp_TxnRef || "");
        const actualOrderId = paymentCode.split("_")[0];
        const rspCode = String(vnp_Params.vnp_ResponseCode || "99");
        if (!validSignature) {
            return res.json({ message: "Invalid Signature", code: "97" });
        }

        const booking = await Booking.findOne({ id: Number(actualOrderId) });
        if (!booking) {
            return res.status(404).json({ message: "Không tìm thấy đơn đặt sân", code: "01" });
        }

        const payment = await Payment.findOne({ paymentCode });
        if (!payment) return res.status(404).json({ message: "Không tìm thấy giao dịch", code: "01" });
        const successful = rspCode === "00";
        const paidAmount = successful
            ? Math.min(Number(booking.total), (Number(booking.paidAmount) || 0) + Number(payment.amount))
            : Number(booking.paidAmount) || 0;
        const fullyPaid = paidAmount >= Number(booking.total);
        await Booking.updateOne(
            { id: booking.id },
            { $set: {
                paidAmount,
                paymentStatus: successful ? (fullyPaid ? "paid" : "deposit_paid") : booking.paymentStatus,
                status: successful ? "confirmed" : booking.status,
                paymentExpiresAt: successful ? null : booking.paymentExpiresAt,
            } }
        );
        await Payment.findOneAndUpdate(
            { paymentCode },
            {
                status: successful ? "success" : "failed",
                transactionCode: String(vnp_Params.vnp_TransactionNo || ""),
                bankCode: String(vnp_Params.vnp_BankCode || ""),
                paidAt: successful ? new Date() : null,
                rawData: vnp_Params,
            },
            { upsert: true, new: true }
        );
        return res.json({ message: successful ? "Success" : "Failed", code: rspCode, bookingId: actualOrderId });
    } catch (error) {
        console.error("VNPAY Return Error:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error", code: "99" });
    }
});

export default router;
