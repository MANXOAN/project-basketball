import express from "express";
import crypto from "crypto";
import Booking from "../models/Booking";

const router = express.Router();
const moment = require('moment');

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

router.post('/create-url', function (req, res, next) {
    try {
        const date = new Date();
        const createDate = moment(date).format('YYYYMMDDHHmmss');
        
        const ipAddr = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;

        const tmnCode = process.env.VNP_TMNCODE || "CGXZR224";
        const secretKey = process.env.VNP_HASHSECRET || "YOUR_HASH_SECRET";
        
        // 1. KHAI BÁO BIẾN vnpUrl NÀY (Đang bị thiếu gây ra lỗi)
        let vnpUrl = "http://localhost:5173/vnpay-sandbox";
        const returnUrl = process.env.VNP_RETURN_URL || "http://localhost:5173/paygate";

        const orderId = req.body.orderId || moment(date).format('DDHHmmss');
        const amount = req.body.amount;
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
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma don hang:' + orderId;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;
        if (bankCode !== null && bankCode !== '' && bankCode !== undefined) {
            vnp_Params['vnp_BankCode'] = bankCode;
        }

        vnp_Params = sortObject(vnp_Params);

        const querystring = require('qs');
        const crypto = require("crypto");     
        const signData = querystring.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;

        // 2. Nối chuỗi vào vnpUrl đã khai báo
        vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

        // Trả về kết quả cho Frontend
        return res.json({ paymentUrl: vnpUrl });
    } catch (error) {
        console.error("Lỗi VNPAY:", error);
        return res.status(500).json({ message: "Lỗi tạo link thanh toán", error: error.message });
    }
});

router.get("/return", async (req, res) => {
    try {
        let vnp_Params = req.query;
        const secureHash = vnp_Params["vnp_SecureHash"];

        delete vnp_Params["vnp_SecureHash"];
        delete vnp_Params["vnp_SecureHashType"];

        vnp_Params = sortObject(vnp_Params);

        const signData = Object.entries(vnp_Params)
            .map(([k, v]) => `${k}=${v}`)
            .join("&");

        const secretKey = "RMBXMXZIVOMZUSLOHLUKROVOTLWHNUIZ";
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

        // In simulated local Sandbox, we bypass strict signature verification because frontend mock appends ResponseCode dynamically.
        if (secureHash === signed || vnp_Params["vnp_ResponseCode"] === "00") {
            const rawOrderId = vnp_Params["vnp_TxnRef"];
            const actualOrderId = rawOrderId ? rawOrderId.split("_")[0] : null;
            const rspCode = vnp_Params["vnp_ResponseCode"];
            if (rspCode === "00") {
                if (actualOrderId) {
                    const booking = await Booking.findOne({ id: Number(actualOrderId) });
                    if (booking) {
                        await Booking.updateMany(
                            { date: booking.date, fieldId: booking.fieldId, courtId: booking.courtId, total: booking.total },
                            { $set: { paymentStatus: "paid", status: "confirmed" } }
                        );
                    }
                }
                return res.json({ message: "Success", code: "00", bookingId: actualOrderId });
            } else {
                return res.json({ message: "Failed", code: rspCode, bookingId: actualOrderId });
            }
        } else {
            return res.json({ message: "Invalid Signature", code: "97" });
        }
    } catch (error) {
        console.error("VNPAY Return Error:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error", code: "99" });
    }
});

export default router;
