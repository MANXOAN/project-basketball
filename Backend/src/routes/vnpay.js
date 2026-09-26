import express from "express";
import crypto from "crypto";
import Booking from "../models/Booking";
import Payment from "../models/Payment";
import BookingAdjustment from "../models/BookingAdjustment";
import { expirePendingPayments } from "../controllers/booking";
import { authRequired } from "../middleware/auth";
import { processVnpayCallback } from "../services/vnpayPayment";

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

router.post('/create-url', authRequired, async function (req, res, next) {
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
        const paymentKind = ["deposit", "balance", "full", "adjustment"].includes(req.body.paymentKind)
            ? req.body.paymentKind
            : "full";
        if (!/^\d+$/.test(orderId) || !Number.isInteger(requestedAmount) || requestedAmount <= 0) {
            return res.status(400).json({ message: "orderId hoặc amount không hợp lệ" });
        }
        const booking = await Booking.findOne({ id: Number(orderId) });
        if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn đặt sân" });
        const staff = req.user?.role === "admin" || req.user?.role === "manager";
        const owner = Number(booking.customer?.userId) === Number(req.user?.id);
        if (!staff && !owner) return res.status(403).json({ message: "Bạn không có quyền thanh toán đơn này" });

        let adjustment = null;
        let expectedAmount = 0;
        if (paymentKind === "adjustment") {
            adjustment = await BookingAdjustment.findOne({
                id: String(req.body.adjustmentId || ""), bookingId: booking.id, status: "pending_payment",
            });
            if (!adjustment || Number(adjustment.paymentDelta) <= 0) {
                return res.status(409).json({ message: "Khoản phụ thu không tồn tại hoặc không còn hiệu lực" });
            }
            expectedAmount = Number(adjustment.paymentDelta);
        } else {
            const groupBookings = booking.bookingGroupId
                ? await Booking.find({ bookingGroupId: booking.bookingGroupId, status: { $ne: "cancelled" } }).sort({ id: 1 })
                : [booking];
            if (!groupBookings.length) return res.status(400).json({ message: "Đơn đã hết hạn hoặc đã hủy" });
            const groupTotal = groupBookings.reduce((sum, item) => sum + Number(item.total || 0), 0);
            const paymentFilter = booking.bookingGroupId
                ? { bookingGroupId: booking.bookingGroupId, status: "success", paymentKind: { $in: ["deposit", "balance", "full"] } }
                : { bookingId: booking.id, status: "success", paymentKind: { $in: ["deposit", "balance", "full"] } };
            const successfulPayments = await Payment.find(paymentFilter).select("amount");
            const paidAmount = successfulPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const groupPaymentStatus = groupBookings[0].paymentStatus;
            if (groupBookings.some((item) => item.paymentStatus !== groupPaymentStatus)) {
                return res.status(409).json({ message: "Trạng thái thanh toán của nhóm lịch không đồng nhất" });
            }
            expectedAmount = paymentKind === "deposit" ? Math.round(groupTotal * 0.3) : paymentKind === "balance" ? Math.max(0, groupTotal - paidAmount) : groupTotal;
            if (paymentKind === "balance" && groupPaymentStatus !== "deposit_paid") return res.status(400).json({ message: "Chỉ có thể thanh toán phần còn lại cho đơn đã đặt cọc" });
            if (paymentKind !== "balance" && groupPaymentStatus !== "unpaid") return res.status(400).json({ message: "Đơn đã có giao dịch thanh toán, vui lòng chỉ thanh toán số tiền còn lại" });
            if (paymentKind === "deposit" && booking.paymentMethod !== "deposit") return res.status(400).json({ message: "Đơn này không sử dụng hình thức đặt cọc" });
        }
        if (expectedAmount <= 0 || requestedAmount !== expectedAmount) {
            return res.status(400).json({ message: "Số tiền thanh toán không khớp với số tiền còn phải trả" });
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
        vnp_Params['vnp_ExpireDate'] = moment(booking.paymentExpiresAt || new Date(date.getTime() + 15 * 60 * 1000)).format('YYYYMMDDHHmmss');
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
                bookingGroupId: booking.bookingGroupId || "",
                paymentCode,
                transactionCode: "",
                gateway: "vnpay",
                amount,
                paymentKind,
                adjustmentId: adjustment?.id || "",
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
        const result = await processVnpayCallback(req.query);
        return res.status(result.code === "01" ? 404 : 200).json(result);
    } catch (error) {
        console.error("VNPAY Return Error:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error", code: "99", state: "error" });
    }
});

router.get("/ipn", async (req, res) => {
    try {
        const result = await processVnpayCallback(req.query);
        const merchantCode = ["success", "failed", "refund_pending", "refunded"].includes(result.state) ? "00" : result.code;
        const messageByCode = {
            "00": "Confirm Success",
            "01": "Order not found",
            "04": "Invalid amount",
            "97": "Invalid signature",
        };
        return res.status(200).json({
            RspCode: merchantCode,
            Message: messageByCode[merchantCode] || result.message || "Unknown error",
        });
    } catch (error) {
        console.error("VNPAY IPN Error:", error);
        return res.status(200).json({ RspCode: "99", Message: "Internal error" });
    }
});

export default router;
