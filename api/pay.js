// api/pay.js

export default async function handler(req, res) {
    const { userId } = req.query;

    if (!userId) return res.status(400).send("User ID missing");

    // পেমেন্ট ডাটা
    const paymentData = {
        full_name: "Docufai User",
        email: "user@docufai.xyz",
        amount: "99", // আপনার নির্ধারিত দাম
        metadata: {
            user_id: userId,
            credits_to_add: 33 // ৩৩ পেজ
        },
        redirect_url: `https://docufai.xyz/success`, // পেমেন্ট শেষে এখানে ফিরবে
        return_type: "GET"
    };

    try {
        const response = await fetch("https://sandbox.uddoktapay.com/api/checkout-v2", {
            method: "POST",
            headers: {
                "Api-Key": process.env.UDDOKTAPAY_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(paymentData)
        });

        const data = await response.json();
        if (data.payment_url) {
            res.redirect(data.payment_url);
        } else {
            res.status(500).send("Payment initiation failed");
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
}
