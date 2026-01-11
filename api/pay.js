// api/pay.js
export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

    const { userId } = req.query; // ফ্রন্টএন্ড থেকে ইউজার আইডি নেওয়া
    if (!userId) return res.status(400).send("User ID is required");

    // UddoktaPay API কনফিগারেশন
    const UDDOKTAPAY_KEY = process.env.UDDOKTAPAY_API_KEY;
    const PANEL_URL = "https://checkout.uddoktapay.com/api/checkout-v2"; // লাইভ ইউআরএল

    const paymentData = {
        full_name: "Docufai Pro User",
        email: "user@example.com",
        amount: "299", // আপনার নির্ধারিত প্রাইস
        metadata: {
            user_id: userId // এই আইডি দিয়েই আমরা পরে ক্রেডিট আপডেট করবো
        },
        redirect_url: `https://${req.headers.host}/success`, // পেমেন্ট শেষে যেখানে যাবে
        cancel_url: `https://${req.headers.host}/cancel`,
        webhook_url: `https://${req.headers.host}/api/webhook` // পেমেন্ট সফল হলে এই এপিআই-তে সিগন্যাল আসবে
    };

    try {
        const response = await fetch(PANEL_URL, {
            method: "POST",
            headers: {
                "RT-UDDOKTAPAY-API-KEY": UDDOKTAPAY_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(paymentData)
        });

        const result = await response.json();
        if (result.payment_url) {
            res.redirect(result.payment_url); // পেমেন্ট পেজে পাঠিয়ে দেওয়া
        } else {
            res.status(500).send("UddoktaPay Error: " + (result.message || "Unknown error"));
        }
    } catch (err) {
        res.status(500).send("System Error: " + err.message);
    }
}
