// api/engine.js
import { ELITE_PROMPT } from './prompts.js';

export default async function handler(req, res) {
    // ... ক্রেডিট চেক লজিক ...

    // এআই-এর কাছে পাঠানো
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "meta-llama/llama-4-scout-17b-16e-instruct", 
            messages: [{ role: "user", content: [
                { type: "text", text: ELITE_PROMPT },
                { type: "image_url", image_url: { url: `data:image/png;base64,${req.body.imageB64}` } }
            ]}]
        })
    });

    const data = await response.json();
    // আউটপুট সরাসরি index.html এ পাঠানো হবে যেখানে formats.js রেন্ডার করবে।
    res.status(200).json(data);
}
