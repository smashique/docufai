// api/pay.js
export default async function handler(req, res) {
    // শুধুমাত্র GET রিকোয়েস্ট এলাউ করা
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

    const { userId } = req.query;
    if (!userId) return res.status(400).send("User ID is required");

    // আপনার প্যানেল থেকে পাওয়া আধুনিক v2 এন্ডপয়েন্ট
    const CHECKOUT_URL = "https://ashique.paymently.io/api/checkout-v2"; 

    const paymentData = {
        full_name: "Docufai Pro User",
        email: "user@example.com",
        amount: "299", // আপনার নির্ধারিত ১০০ পেজের দাম
        metadata: {
            user_id: userId // এটি আপনার সুপাবেস ডাটাবেসে ক্রেডিট আপডেট করতে ব্যবহৃত হবে
        },
        redirect_url: `https://${req.headers.host}/success`,
        cancel_url: `https://${req.headers.host}/cancel`,
        webhook_url: `https://${req.headers.host}/api/webhook`
    };

    try {
        const response = await fetch(CHECKOUT_URL, {
            method: "POST",
            headers: {
                // আপনার ড্যাশবোর্ড থেকে প্রাপ্ত এপিআই কী
                "RT-UDDOKTAPAY-API-KEY": process.env.UDDOKTAPAY_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(paymentData)
        });

        const result = await response.json();
        
        // পেমেন্ট ইউআরএল থাকলে সেখানে পাঠিয়ে দেওয়া
        if (result.payment_url) {
            res.redirect(result.payment_url);
        } else {
            res.status(500).json({ error: "Gateway Error", details: result });
        }
    } catch (err) {
        res.status(500).send("System Error: " + err.message);
    }
}
