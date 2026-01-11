// api/pay.js আপডেট কোড
export default async function handler(req, res) {
    const { userId } = req.query;
    const CHECKOUT_URL = "https://ashique.paymently.io/api/checkout"; // আপনার প্রাপ্ত নির্দিষ্ট লিঙ্ক

    const paymentData = {
        full_name: "Docufai User",
        email: "user@example.com",
        amount: "299", // আপনার ফিক্সড প্রাইস
        metadata: { user_id: userId },
        redirect_url: `https://${req.headers.host}/success`,
        cancel_url: `https://${req.headers.host}/cancel`,
        webhook_url: `https://${req.headers.host}/api/webhook`
    };

    try {
        const response = await fetch(CHECKOUT_URL, {
            method: "POST",
            headers: {
                "RT-UDDOKTAPAY-API-KEY": process.env.UDDOKTAPAY_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(paymentData)
        });

        const result = await response.json();
        // আপনার প্যানেল অনুযায়ী payment_url এ রিডাইরেক্ট করা
        if (result.payment_url) res.redirect(result.payment_url);
        else res.status(500).json(result);
    } catch (err) {
        res.status(500).send(err.message);
    }
}
